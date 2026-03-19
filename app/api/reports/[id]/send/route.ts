import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  // Verify the report belongs to this studio
  const { data: report } = await admin
    .from('reports')
    .select('id, client_id, status, clients(studio_id)')
    .eq('id', id)
    .single()

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const clientStudioId = (report as any).clients?.studio_id
  if (clientStudioId !== userRecord.studio_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (report.status === 'sent') {
    return NextResponse.json({ error: 'Report has already been sent.' }, { status: 409 })
  }

  const { error } = await admin
    .from('reports')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to send report.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
