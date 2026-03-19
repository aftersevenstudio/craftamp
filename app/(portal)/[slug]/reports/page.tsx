import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ReportViewer from '@/components/ui/report-viewer'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PortalReportsPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: userRecord } = await admin
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single()

  const clientId = userRecord?.client_id

  const { data: clientRecord } = clientId
    ? await admin.from('clients').select('business_name').eq('id', clientId).single()
    : { data: null }

  const { data: reports } = clientId
    ? await admin
        .from('reports')
        .select('id, period_month, sent_at')
        .eq('client_id', clientId)
        .eq('status', 'sent')
        .order('period_month', { ascending: false })
    : { data: [] }

  if (!reports?.length) {
    return (
      <div className='text-center py-20'>
        <p className='text-gray-400 text-sm'>No reports yet — check back after your first month.</p>
      </div>
    )
  }

  // Load sections for the most recent report by default
  const latestReport = reports[0]
  const { data: sections } = await admin
    .from('report_sections')
    .select('section_type, ai_content, display_order')
    .eq('report_id', latestReport.id)
    .order('display_order')

  const [year, month] = latestReport.period_month.split('-')
  const periodLabel = new Date(Number(year), Number(month) - 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-gray-900'>Reports</h1>
        {reports.length > 1 && (
          <p className='text-sm text-gray-500'>{reports.length} reports total</p>
        )}
      </div>

      <ReportViewer
        sections={sections ?? []}
        periodLabel={periodLabel}
        businessName={clientRecord?.business_name ?? ''}
      />
    </div>
  )
}
