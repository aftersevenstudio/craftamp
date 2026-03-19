import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import SendReportButton from './send-report-button'
import ReportViewer from '@/components/ui/report-viewer'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: report } = await admin
    .from('reports')
    .select('id, status, period_month, sent_at, client_id')
    .eq('id', id)
    .single()

  if (!report) notFound()

  const [{ data: client }, { data: sections }] = await Promise.all([
    admin.from('clients').select('business_name, studio_id').eq('id', report.client_id).single(),
    admin
      .from('report_sections')
      .select('section_type, ai_content, display_order')
      .eq('report_id', id)
      .order('display_order'),
  ])

  const { data: userRecord } = await admin
    .from('users')
    .select('studio_id')
    .eq('id', user.id)
    .single()

  if (client?.studio_id !== userRecord?.studio_id) redirect('/studio/dashboard/reports')

  const [year, month] = report.period_month.split('-')
  const periodLabel = new Date(Number(year), Number(month) - 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className='min-h-screen bg-gray-50'>
      <header className='bg-white border-b'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <Link href='/studio/dashboard' className='text-sm text-gray-500 hover:text-gray-700'>Dashboard</Link>
            <span className='text-gray-300'>/</span>
            <Link href='/studio/dashboard/reports' className='text-sm text-gray-500 hover:text-gray-700'>Reports</Link>
            <span className='text-gray-300'>/</span>
            <span className='text-sm font-medium text-gray-900'>{periodLabel}</span>
          </div>
          {report.status === 'draft' && <SendReportButton reportId={id} />}
          {report.status === 'sent' && (
            <Badge variant='default'>
              Sent {report.sent_at ? new Date(report.sent_at).toLocaleDateString() : ''}
            </Badge>
          )}
        </div>
      </header>

      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <ReportViewer
          sections={sections ?? []}
          periodLabel={periodLabel}
          businessName={client?.business_name ?? ''}
        />
      </main>
    </div>
  )
}
