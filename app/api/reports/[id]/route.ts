import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: userRecord } = await admin
    .from('users')
    .select('studio_id, role')
    .eq('id', user.id)
    .single()

  if (!userRecord || userRecord.role !== 'studio_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify the report belongs to this studio and is a draft
  const { data: report } = await admin
    .from('reports')
    .select('id, status, client_id')
    .eq('id', id)
    .single()

  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (report.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft reports can be deleted.' }, { status: 400 })
  }

  // Confirm the client belongs to this studio
  const { data: client } = await admin
    .from('clients')
    .select('id')
    .eq('id', report.client_id)
    .eq('studio_id', userRecord.studio_id)
    .single()

  if (!client) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await admin.from('report_sections').delete().eq('report_id', id)
  await admin.from('reports').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
