import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  params: Promise<{ slug: string }>
}

function formatPeriod(periodMonth: string) {
  const [year, month] = periodMonth.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

export default async function PortalOverviewPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: userRecord }, { data: studio }] = await Promise.all([
    admin.from('users').select('client_id').eq('id', user.id).single(),
    admin.from('studios').select('name, brand_color').eq('slug', slug).single(),
  ])

  const clientId = userRecord?.client_id
  const accent = studio?.brand_color ?? '#6366f1'

  const [{ data: client }, { data: reports }, { data: opportunities }] = await Promise.all([
    clientId
      ? admin.from('clients').select('business_name, business_type, contact_name').eq('id', clientId).single()
      : Promise.resolve({ data: null }),
    clientId
      ? admin.from('reports').select('id, status, period_month, sent_at').eq('client_id', clientId).eq('status', 'sent').order('period_month', { ascending: false })
      : Promise.resolve({ data: [] }),
    clientId
      ? admin.from('opportunities').select('id, title, type, status').eq('client_id', clientId).eq('status', 'open').order('created_at', { ascending: false }).limit(3)
      : Promise.resolve({ data: [] }),
  ])

  const latestReport = reports?.[0] ?? null
  const firstName = client?.contact_name?.split(' ')[0] ?? null

  return (
    <div className='space-y-8'>

      {/* Welcome hero */}
      <div className='rounded-xl overflow-hidden'>
        <div className='px-6 py-8' style={{ background: `${accent}15` }}>
          <p className='text-sm font-medium mb-1' style={{ color: accent }}>
            Welcome back{firstName ? `, ${firstName}` : ''}
          </p>
          <h1 className='text-2xl font-bold text-gray-900'>
            {client?.business_name ?? 'Your Portal'}
          </h1>
          {client?.business_type && (
            <p className='text-sm text-gray-500 mt-1'>{client.business_type}</p>
          )}
        </div>
      </div>

      {/* Latest report CTA — the most important thing */}
      {latestReport ? (
        <div className='rounded-xl border-2 p-6 flex items-center justify-between gap-4' style={{ borderColor: accent }}>
          <div>
            <p className='text-xs font-semibold uppercase tracking-wide mb-1' style={{ color: accent }}>
              Latest report
            </p>
            <p className='text-lg font-bold text-gray-900'>{formatPeriod(latestReport.period_month)}</p>
            <p className='text-sm text-gray-500 mt-0.5'>
              Delivered {new Date(latestReport.sent_at!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <Link
            href={`/${slug}/reports`}
            className='shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90'
            style={{ background: accent }}
          >
            View report →
          </Link>
        </div>
      ) : (
        <div className='rounded-xl border border-dashed p-8 text-center'>
          <p className='text-gray-500 text-sm'>Your first report will appear here once it's ready.</p>
        </div>
      )}

      {/* Stats row */}
      <div className='grid grid-cols-3 gap-4'>
        <Card>
          <CardContent className='pt-5 pb-4'>
            <p className='text-2xl font-bold text-gray-900'>{reports?.length ?? 0}</p>
            <p className='text-xs text-gray-500 mt-1'>Reports delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-5 pb-4'>
            <p className='text-2xl font-bold text-gray-900'>{opportunities?.length ?? 0}</p>
            <p className='text-xs text-gray-500 mt-1'>Open opportunities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-5 pb-4'>
            <p className='text-2xl font-bold text-gray-900'>
              {latestReport ? formatPeriod(latestReport.period_month).split(' ')[0] : '—'}
            </p>
            <p className='text-xs text-gray-500 mt-1'>Latest period</p>
          </CardContent>
        </Card>
      </div>

      {/* Report history */}
      {(reports?.length ?? 0) > 1 && (
        <div>
          <div className='flex items-center justify-between mb-3'>
            <h2 className='text-sm font-semibold text-gray-900'>Report history</h2>
            <Link href={`/${slug}/reports`} className='text-xs text-gray-400 hover:text-gray-600'>
              View all →
            </Link>
          </div>
          <div className='space-y-2'>
            {reports!.slice(1, 4).map((report) => (
              <Link key={report.id} href={`/${slug}/reports?id=${report.id}`}>
                <Card className='hover:shadow-sm transition-shadow cursor-pointer mb-3'>
                  <CardContent className='py-3 flex items-center justify-between'>
                    <span className='text-sm text-gray-700'>{formatPeriod(report.period_month)}</span>
                    <span className='text-xs text-gray-400'>
                      {new Date(report.sent_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Opportunities */}
      {(opportunities?.length ?? 0) > 0 && (
        <div>
          <div className='flex items-center justify-between mb-3'>
            <h2 className='text-sm font-semibold text-gray-900'>Open opportunities</h2>
            <Link href={`/${slug}/opportunities`} className='text-xs text-gray-400 hover:text-gray-600'>
              View all →
            </Link>
          </div>
          <div className='space-y-2'>
            {opportunities!.map((opp) => (
              <Card key={opp.id}>
                <CardContent className='py-3 flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-800'>{opp.title}</p>
                    <p className='text-xs text-gray-400 capitalize mt-0.5'>{opp.type}</p>
                  </div>
                  <Badge variant='secondary'>{opp.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
