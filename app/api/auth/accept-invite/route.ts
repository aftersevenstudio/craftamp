import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import { clientAcceptedInviteEmail } from '@/lib/email/client-accepted-invite'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { token, password } = parsed.data
  const admin = createAdminClient()

  // Validate the token
  const { data: invitation } = await admin
    .from('invitations')
    .select('id, email, client_id, accepted_at, expires_at')
    .eq('token', token)
    .single()

  if (!invitation) {
    return NextResponse.json({ error: 'Invalid or expired invitation.' }, { status: 400 })
  }

  if (invitation.accepted_at) {
    return NextResponse.json({ error: 'This invitation has already been used.' }, { status: 400 })
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invitation has expired.' }, { status: 400 })
  }

  const { data: client } = await admin
    .from('clients')
    .select('studio_id, business_name')
    .eq('id', invitation.client_id)
    .single()

  const studioId = client?.studio_id

  // Check if an auth user already exists for this email (e.g. from a failed previous attempt)
  // and clean it up before creating a fresh one
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const existingUser = existingUsers?.users.find((u) => u.email === invitation.email)

  if (existingUser) {
    // Only clean up if there's no completed users profile row — if there is, the account is real
    const { data: existingProfile } = await admin
      .from('users')
      .select('id')
      .eq('id', existingUser.id)
      .single()

    if (existingProfile) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Try signing in.' },
        { status: 409 }
      )
    }

    // Orphaned auth user — delete it so we can recreate cleanly
    await admin.auth.admin.deleteUser(existingUser.id)
  }

  // Create the auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? 'Failed to create account.' },
      { status: 400 }
    )
  }

  const userId = authData.user.id

  // Create the users profile row
  const { error: userError } = await admin.from('users').insert({
    id: userId,
    studio_id: studioId,
    client_id: invitation.client_id,
    email: invitation.email,
    role: 'client_user',
  })

  if (userError) {
    await admin.auth.admin.deleteUser(userId)
    console.error('[accept-invite] user insert error:', userError)
    return NextResponse.json({ error: 'Failed to create user profile.' }, { status: 500 })
  }

  // Mark invitation as accepted
  await admin
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  // Notify the studio admin
  if (studioId && client?.business_name) {
    try {
      const [{ data: studioAdmin }, { data: studio }] = await Promise.all([
        admin
          .from('users')
          .select('email')
          .eq('studio_id', studioId)
          .eq('role', 'studio_admin')
          .single(),
        admin
          .from('studios')
          .select('slug, name')
          .eq('id', studioId)
          .single(),
      ])

      if (studioAdmin?.email && studio) {
        const isProd = process.env.NODE_ENV === 'production'
        const clientUrl = isProd
          ? `https://app.craftamp.com/studio/dashboard/clients/${invitation.client_id}`
          : `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/studio/dashboard/clients/${invitation.client_id}`

        await resend.emails.send({
          from: `Craftamp <${process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'}>`,
          to: studioAdmin.email,
          subject: `${client.business_name} has accepted their portal invitation`,
          html: clientAcceptedInviteEmail({
            adminName: null,
            businessName: client.business_name,
            clientEmail: invitation.email,
            clientUrl,
          }),
        })
      }
    } catch (err) {
      // Non-fatal — don't block the response
      console.error('[accept-invite] notification email failed:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
