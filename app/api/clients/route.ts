import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import { inviteEmail } from '@/lib/email/invite'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: userRecord } = await admin
    .from('users')
    .select('studio_id')
    .eq('id', user.id)
    .single()

  const { data: clients } = userRecord?.studio_id
    ? await admin
        .from('clients')
        .select('id, business_name')
        .eq('studio_id', userRecord.studio_id)
        .order('business_name')
    : { data: [] }

  return NextResponse.json({ clients: clients ?? [] })
}

const schema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  businessType: z.string().optional(),
  timezone: z.string().min(1, 'Timezone is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email('Invalid email address'),
})

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use admin client to bypass RLS — we already verified the auth user above
  const admin = createAdminClient()

  const { data: userRecord, error: userRecordError } = await admin
    .from('users')
    .select('studio_id, role')
    .eq('id', user.id)
    .single()

  if (userRecordError || !userRecord) {
    console.error('[clients] userRecord lookup failed:', userRecordError)
    return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
  }

  if (userRecord.role !== 'studio_admin' || !userRecord.studio_id) {
    return NextResponse.json({ error: 'Not a studio admin' }, { status: 403 })
  }

  const { data: studio, error: studioError } = await admin
    .from('studios')
    .select('id, name, slug, brand_color, logo_url')
    .eq('id', userRecord.studio_id)
    .single()

  if (studioError || !studio) {
    console.error('[clients] studio lookup failed:', studioError)
    return NextResponse.json({ error: 'Studio not found' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { businessName, businessType, timezone, contactName, contactEmail } = parsed.data

  // Create the client record
  const { data: client, error: clientError } = await admin
    .from('clients')
    .insert({
      studio_id: userRecord.studio_id,
      business_name: businessName,
      business_type: businessType ?? null,
      timezone,
      contact_name: contactName,
      contact_email: contactEmail,
    })
    .select('id')
    .single()

  if (clientError || !client) {
    console.error('[clients] insert error:', clientError)
    return NextResponse.json({ error: 'Failed to create client.' }, { status: 500 })
  }

  // Generate a secure invite token (expires in 7 days)
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error: inviteError } = await admin.from('invitations').insert({
    client_id: client.id,
    email: contactEmail,
    token,
    expires_at: expiresAt,
  })

  if (inviteError) {
    console.error('[clients] invitation insert error:', inviteError)
    await admin.from('clients').delete().eq('id', client.id)
    return NextResponse.json({ error: 'Failed to create invitation.' }, { status: 500 })
  }

  // Send the invite email
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`

  const isProd = process.env.NODE_ENV === 'production'
  const portalUrl = isProd
    ? `https://${studio.slug}.craftamp.com`
    : `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/${studio.slug}/overview`

  const { error: emailError } = await resend.emails.send({
    from: `Craftamp <${process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'}>`,
    to: contactEmail,
    subject: `You've been invited to ${studio.name}'s client portal`,
    html: inviteEmail({ contactName, studioName: studio.name, brandColor: studio.brand_color, logoUrl: studio.logo_url, inviteUrl, portalUrl }),
  })

  if (emailError) {
    console.error('[clients] email error:', emailError)
    // Client + invite are saved — return the invite URL so it can be shared manually
    return NextResponse.json({
      clientId: client.id,
      emailError: emailError.message,
      inviteUrl,
    })
  }

  return NextResponse.json({ clientId: client.id })
}
