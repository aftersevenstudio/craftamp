import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: userRecord } = await admin
    .from('users')
    .select('studio_id, role')
    .eq('id', user.id)
    .single()

  if (!userRecord || userRecord.role !== 'studio_admin' || !userRecord.studio_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('logo') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

  const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'File must be PNG, JPG, SVG, or WebP.' }, { status: 400 })
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 2MB.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${userRecord.studio_id}/logo.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await admin.storage
    .from('logos')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('[logo upload]', uploadError)
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from('logos').getPublicUrl(path)

  // Bust cache by appending a timestamp
  const logoUrl = `${publicUrl}?t=${Date.now()}`

  const { error: updateError } = await admin
    .from('studios')
    .update({ logo_url: logoUrl })
    .eq('id', userRecord.studio_id)

  if (updateError) {
    console.error('[logo upload] studio update failed:', updateError)
    return NextResponse.json({ error: 'Logo uploaded but failed to save URL.' }, { status: 500 })
  }

  return NextResponse.json({ logoUrl })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: userRecord } = await admin
    .from('users')
    .select('studio_id, role')
    .eq('id', user.id)
    .single()

  if (!userRecord || userRecord.role !== 'studio_admin' || !userRecord.studio_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await admin.from('studios').update({ logo_url: null }).eq('id', userRecord.studio_id)

  return NextResponse.json({ ok: true })
}
