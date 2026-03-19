import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  title: z.string().min(1),
  type: z.string().min(1),
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

export async function GET(
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
  const { data: opportunities } = await admin
    .from('opportunities')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ opportunities: opportunities ?? [] })
}

export async function POST(
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

  // Verify client belongs to this studio
  const { data: client } = await admin
    .from('clients')
    .select('id')
    .eq('id', id)
    .eq('studio_id', studioId)
    .single()

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: opportunity, error } = await admin
    .from('opportunities')
    .insert({
      client_id: id,
      title: parsed.data.title,
      type: parsed.data.type,
      description: parsed.data.description ?? null,
      status: 'open',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create opportunity.' }, { status: 500 })

  return NextResponse.json({ opportunity })
}
