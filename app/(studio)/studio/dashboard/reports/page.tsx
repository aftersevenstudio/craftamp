import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import DeleteReportButton from './delete-report-button'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: userRecord } = await admin
    .from('users')
    .select('studio_id')
    .eq('id', user.id)
    .single()

  const { data: clients } = userRecord?.studio_id
    ? await admin.from('clients').select('id, business_name').eq('studio_id', userRecord.studio_id)
    : { data: [] }

  const clientIds = (clients ?? []).map((c) => c.id)
  const clientMap = new Map((clients ?? []).map((c) => [c.id, c.business_name]))

  const { data: reports } = clientIds.length
    ? await admin
        .from('reports')
        .select('id, client_id, status, period_month, sent_at, created_at')
        .in('client_id', clientIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <div className='min-h-screen bg-gray-50'>
      <header className='bg-white border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <Link href='/studio/dashboard' className='text-sm text-gray-500 hover:text-gray-700'>
              Dashboard
            </Link>
            <span className='text-gray-300'>/</span>
            <span className='text-sm font-medium text-gray-900'>Reports</span>
          </div>
          <Link href='/studio/dashboard/reports/new'>
            <Button size='sm'>Generate report</Button>
          </Link>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <h1 className='text-2xl font-bold text-gray-900 mb-6'>Reports</h1>

        {!reports?.length ? (
          <Card>
            <CardContent className='py-16 text-center'>
              <p className='text-gray-500 mb-4'>No reports yet.</p>
              <Link href='/studio/dashboard/reports/new'>
                <Button>Generate your first report</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-3'>
            {reports.map((report) => (
              <Link key={report.id} href={`/studio/dashboard/reports/${report.id}`}>
                <Card className='hover:shadow-sm transition-shadow cursor-pointer mb-4'>
                  <CardContent className='py-4 flex items-center justify-between'>
                    <div>
                      <p className='font-medium text-gray-900'>
                        {clientMap.get(report.client_id) ?? 'Unknown client'}
                      </p>
                      <p className='text-sm text-gray-500'>
                        {new Date(report.period_month + '-02').toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className='flex items-center gap-3'>
                      {report.status === 'draft' && (
                        <DeleteReportButton reportId={report.id} />
                      )}
                      <Badge variant={report.status === 'sent' ? 'default' : 'secondary'}>
                        {report.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
