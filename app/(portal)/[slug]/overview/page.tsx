import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OverviewOpportunities from './overview-opportunities'

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

function timeAgo(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

  const [
    { data: client },
    { data: reports },
    { data: oppPreview },
    { count: totalOpenOpps },
    { data: latestPulse },
  ] = await Promise.all([
    clientId
      ? admin.from('clients').select('business_name, business_type, contact_name').eq('id', clientId).single()
      : Promise.resolve({ data: null }),
    clientId
      ? admin.from('reports').select('id, status, period_month, sent_at').eq('client_id', clientId).eq('status', 'sent').order('period_month', { ascending: false })
      : Promise.resolve({ data: [] }),
    clientId
      ? admin.from('opportunities').select('id, title, type, description, source, cta_label, status').eq('client_id', clientId).in('status', ['open', 'in_progress']).order('created_at', { ascending: false }).limit(2)
      : Promise.resolve({ data: [] }),
    clientId
      ? admin.from('opportunities').select('id', { count: 'exact', head: true }).eq('client_id', clientId).in('status', ['open', 'in_progress'])
      : Promise.resolve({ count: 0 }),
    clientId
      ? admin.from('weekly_pulses').select('week_start, summary, recommendation').eq('client_id', clientId).eq('status', 'completed').order('week_start', { ascending: false }).limit(1).single()
      : Promise.resolve({ data: null }),
  ])

  const latestReport = reports?.[0] ?? null
  const firstName = client?.contact_name?.split(' ')[0] ?? null
  const openOpps = oppPreview ?? []
  const openOppsCount = totalOpenOpps ?? 0
  const isEmpty = !latestReport && openOppsCount === 0 && !latestPulse

  return (
    <div className='space-y-6'>

      {/* Welcome */}
      <div className='rounded-xl px-6 py-6' style={{ background: `${accent}12` }}>
        <p className='text-xs font-semibold uppercase tracking-wide mb-1' style={{ color: accent }}>
          Welcome back{firstName ? `, ${firstName}` : ''}
        </p>
        <h1 className='text-2xl font-bold text-gray-900'>{client?.business_name ?? 'Your Portal'}</h1>
        {studio?.name && (
          <p className='text-sm text-gray-400 mt-0.5'>Managed by {studio.name}</p>
        )}
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className='rounded-xl border border-dashed border-gray-200 px-8 py-12 text-center space-y-2'>
          <p className='text-sm font-medium text-gray-700'>You're all set up — here's what's coming</p>
          <p className='text-sm text-gray-400 max-w-sm mx-auto'>
            Your studio will send monthly reports, surface growth opportunities, and check in weekly. Everything will appear right here.
          </p>
        </div>
      )}

      {/* Latest report */}
      {latestReport ? (
        <div className='rounded-xl border-2 p-5 flex items-center justify-between gap-4' style={{ borderColor: accent }}>
          <div>
            <p className='text-xs font-semibold uppercase tracking-wide mb-1' style={{ color: accent }}>
              Latest report
            </p>
            <p className='text-lg font-bold text-gray-900'>{formatPeriod(latestReport.period_month)}</p>
            <p className='text-sm text-gray-400 mt-0.5'>
              Delivered {latestReport.sent_at ? timeAgo(latestReport.sent_at) : ''}
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
      ) : !isEmpty && (
        <div className='rounded-xl border border-dashed border-gray-200 p-6 text-center'>
          <p className='text-sm text-gray-400'>Your first report will appear here once it's ready.</p>
        </div>
      )}

      {/* Stats */}
      {!isEmpty && (
        <div className='grid grid-cols-3 gap-3'>
          <div className='bg-white rounded-xl border border-gray-200 px-4 py-4'>
            <p className='text-2xl font-bold text-gray-900'>{reports?.length ?? 0}</p>
            <p className='text-xs text-gray-400 mt-1'>Reports delivered</p>
          </div>
          <div className='bg-white rounded-xl border border-gray-200 px-4 py-4'>
            <p className='text-2xl font-bold text-gray-900'>{openOppsCount}</p>
            <p className='text-xs text-gray-400 mt-1'>Open opportunities</p>
          </div>
          <div className='bg-white rounded-xl border border-gray-200 px-4 py-4'>
            <p className='text-2xl font-bold text-gray-900'>
              {latestPulse?.week_start ? timeAgo(latestPulse.week_start) : '—'}
            </p>
            <p className='text-xs text-gray-400 mt-1'>Last check-in</p>
          </div>
        </div>
      )}

      {/* Opportunities with actions */}
      {openOppsCount > 0 && (
        <OverviewOpportunities
          initialOpps={openOpps}
          totalCount={openOppsCount}
          slug={slug}
          accent={accent}
        />
      )}

      {/* Latest pulse insight */}
      {(latestPulse?.summary || latestPulse?.recommendation) && (
        <div className='rounded-xl border border-gray-200 bg-white px-5 py-5'>
          <div className='flex items-center justify-between mb-3'>
            <h2 className='text-sm font-semibold text-gray-900'>From your last check-in</h2>
            {latestPulse.week_start && (
              <span className='text-xs text-gray-400'>
                Week of {new Date(latestPulse.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          {latestPulse.summary && (
            <p className='text-sm text-gray-600 leading-relaxed'>{latestPulse.summary}</p>
          )}
          {latestPulse.recommendation && (
            <p className='text-sm text-gray-500 mt-2 leading-relaxed'>→ {latestPulse.recommendation}</p>
          )}
        </div>
      )}

    </div>
  )
}
