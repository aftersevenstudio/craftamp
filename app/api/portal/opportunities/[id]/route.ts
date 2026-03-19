import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Clients can change status but cannot edit title/description or hard-delete
const schema = z.object({
  status: z.enum(['open', 'in_progress', 'completed', 'dismissed']),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: userRecord } = await admin
    .from('users')
    .select('role, client_id')
    .eq('id', user.id)
    .single()

  if (!userRecord || userRecord.role !== 'client_user' || !userRecord.client_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  // Verify the opportunity belongs to this client
  const { data: opp } = await admin
    .from('opportunities')
    .select('id, client_id')
    .eq('id', id)
    .eq('client_id', userRecord.client_id)
    .single()

  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: updated } = await admin
    .from('opportunities')
    .update({ status: parsed.data.status })
    .eq('id', id)
    .select('*')
    .single()

  return NextResponse.json({ opportunity: updated })
}
