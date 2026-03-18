import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PortalOverviewPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await admin
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single()

  const clientId = userRecord?.client_id

  const [
    { data: client },
    { data: reports },
    { data: opportunities },
  ] = await Promise.all([
    clientId
      ? admin.from('clients').select('business_name, business_type').eq('id', clientId).single()
      : Promise.resolve({ data: null }),
    clientId
      ? admin.from('reports').select('id, status, period_month, sent_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    clientId
      ? admin.from('opportunities').select('id, title, type, status').eq('client_id', clientId).order('created_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
  ])

  const sentReports = (reports ?? []).filter((r) => r.status === 'sent')
  const openOpportunities = (opportunities ?? []).filter((o) => o.status === 'open')

  return (
    <div className='space-y-8'>
      {/* Welcome */}
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>
          {client?.business_name ?? 'Your Portal'}
        </h1>
        {client?.business_type && (
          <p className='text-sm text-gray-500 mt-1'>{client.business_type}</p>
        )}
      </div>

      {/* Stats */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <Card>
          <CardContent className='pt-6'>
            <p className='text-3xl font-bold text-gray-900'>{sentReports.length}</p>
            <p className='text-sm text-gray-500 mt-1'>Reports delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-6'>
            <p className='text-3xl font-bold text-gray-900'>{openOpportunities.length}</p>
            <p className='text-sm text-gray-500 mt-1'>Open opportunities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-6'>
            <p className='text-3xl font-bold text-gray-900'>
              {sentReports[0]
                ? new Date(sentReports[0].sent_at!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : '—'}
            </p>
            <p className='text-sm text-gray-500 mt-1'>Last report</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent reports */}
      <div>
        <div className='flex items-center justify-between mb-3'>
          <h2 className='text-base font-semibold text-gray-900'>Recent reports</h2>
          <Link href={`/${slug}/reports`} className='text-sm text-gray-500 hover:text-gray-700'>
            View all →
          </Link>
        </div>

        {!sentReports.length ? (
          <Card>
            <CardContent className='py-10 text-center text-sm text-gray-400'>
              No reports yet — your first one will appear here.
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-2'>
            {sentReports.slice(0, 3).map((report) => (
              <Card key={report.id}>
                <CardContent className='py-3 flex items-center justify-between'>
                  <span className='text-sm font-medium text-gray-800'>{report.period_month}</span>
                  <Badge variant='default'>Delivered</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent opportunities */}
      <div>
        <div className='flex items-center justify-between mb-3'>
          <h2 className='text-base font-semibold text-gray-900'>Opportunities</h2>
          <Link href={`/${slug}/opportunities`} className='text-sm text-gray-500 hover:text-gray-700'>
            View all →
          </Link>
        </div>

        {!openOpportunities.length ? (
          <Card>
            <CardContent className='py-10 text-center text-sm text-gray-400'>
              No open opportunities right now.
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-2'>
            {openOpportunities.slice(0, 3).map((opp) => (
              <Card key={opp.id}>
                <CardContent className='py-3 flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-800'>{opp.title}</p>
                    <p className='text-xs text-gray-400 capitalize'>{opp.type}</p>
                  </div>
                  <Badge variant='secondary'>{opp.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
