import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  business_name: z.string().min(1).optional(),
  business_type: z.string().optional(),
  city: z.string().optional(),
  description: z.string().optional(),
  primary_goal: z.string().optional(),
  target_audience: z.string().optional(),
  timezone: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional(),
  ga4_property_id: z.string().optional(),
  gbp_location_id: z.string().optional(),
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
  const { data: client } = await admin
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('studio_id', studioId)
    .single()

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ client })
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

  // Verify ownership
  const { data: existing } = await admin
    .from('clients')
    .select('id')
    .eq('id', id)
    .eq('studio_id', studioId)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: client, error } = await admin
    .from('clients')
    .update(parsed.data)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update client.' }, { status: 500 })

  return NextResponse.json({ client })
}
