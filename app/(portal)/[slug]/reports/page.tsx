import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ReportViewer from '@/components/ui/report-viewer'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ id?: string }>
}

function formatPeriod(periodMonth: string) {
  const [year, month] = periodMonth.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

export default async function PortalReportsPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { id: selectedId } = await searchParams

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

  const [{ data: clientRecord }, { data: reports }] = await Promise.all([
    clientId
      ? admin.from('clients').select('business_name').eq('id', clientId).single()
      : Promise.resolve({ data: null }),
    clientId
      ? admin
          .from('reports')
          .select('id, period_month, sent_at')
          .eq('client_id', clientId)
          .eq('status', 'sent')
          .order('period_month', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  if (!reports?.length) {
    return (
      <div className='text-center py-20'>
        <p className='text-gray-400 text-sm'>No reports yet — check back after your first month.</p>
      </div>
    )
  }

  const activeReport = reports.find((r) => r.id === selectedId) ?? reports[0]

  const { data: sections } = await admin
    .from('report_sections')
    .select('section_type, ai_content, display_order')
    .eq('report_id', activeReport.id)
    .order('display_order')

  const periodLabel = formatPeriod(activeReport.period_month)

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-gray-900'>Reports</h1>
        <span className='text-sm text-gray-400'>{reports.length} report{reports.length !== 1 ? 's' : ''} total</span>
      </div>

      {/* Report selector — only show if more than one */}
      {reports.length > 1 && (
        <div className='flex gap-2 flex-wrap'>
          {reports.map((report) => {
            const isActive = report.id === activeReport.id
            return (
              <Link
                key={report.id}
                href={`/${slug}/reports?id=${report.id}`}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {formatPeriod(report.period_month)}
              </Link>
            )
          })}
        </div>
      )}

      <ReportViewer
        sections={sections ?? []}
        periodLabel={periodLabel}
        businessName={clientRecord?.business_name ?? ''}
      />
    </div>
  )
}
