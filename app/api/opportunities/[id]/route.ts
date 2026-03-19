import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  status: z.enum(['open', 'in_progress', 'completed', 'dismissed']).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
})

async function getStudioId(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('studio_id, role')
    .eq('id', userId)
    .single()
  return data?.role === 'studio_admin' ? data.studio_id : null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studioId = await getStudioId(user.id)
  if (!studioId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify the opportunity belongs to a client in this studio
  const { data: opp } = await admin
    .from('opportunities')
    .select('client_id')
    .eq('id', id)
    .single()

  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: client } = await admin
    .from('clients')
    .select('id')
    .eq('id', opp.client_id)
    .eq('studio_id', studioId)
    .single()

  if (!client) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: updated } = await admin
    .from('opportunities')
    .update(parsed.data)
    .eq('id', id)
    .select('*')
    .single()

  return NextResponse.json({ opportunity: updated })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studioId = await getStudioId(user.id)
  if (!studioId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const { data: opp } = await admin
    .from('opportunities')
    .select('client_id')
    .eq('id', id)
    .single()

  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: client } = await admin
    .from('clients')
    .select('id')
    .eq('id', opp.client_id)
    .eq('studio_id', studioId)
    .single()

  if (!client) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await admin.from('opportunities').delete().eq('id', id)

  return NextResponse.json({ ok: true })
}
