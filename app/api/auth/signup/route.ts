import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  studioName: z.string().min(2, 'Studio name must be at least 2 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(48, 'Slug must be 48 characters or fewer')
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid input'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { studioName, slug, email, password } = parsed.data
  const admin = createAdminClient()

  // Check slug is available
  const { data: existing } = await admin
    .from('studios')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'That studio URL is already taken.' }, { status: 409 })
  }

  // Create the auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
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

  // Insert studio
  const { data: studio, error: studioError } = await admin
    .from('studios')
    .insert({ name: studioName, slug })
    .select('id')
    .single()

  if (studioError || !studio) {
    // Roll back auth user so the email isn't stuck
    await admin.auth.admin.deleteUser(userId)
    console.error('[signup] studio insert error:', studioError)
    return NextResponse.json(
      { error: studioError?.message ?? 'Failed to create studio.' },
      { status: 500 }
    )
  }

  // Insert user profile row
  const { error: userError } = await admin.from('users').insert({
    id: userId,
    studio_id: studio.id,
    email,
    role: 'studio_admin',
  })

  if (userError) {
    await admin.auth.admin.deleteUser(userId)
    await admin.from('studios').delete().eq('id', studio.id)
    return NextResponse.json({ error: 'Failed to create user profile.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
