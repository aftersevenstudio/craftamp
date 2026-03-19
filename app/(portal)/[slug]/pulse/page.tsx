import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'

interface Props {
  params: Promise<{ slug: string }>
}

const SOURCE_LABELS: Record<string, string> = {
  Instagram: '📸 Instagram',
  Google: '🔍 Google',
  Referral: '🤝 Referral',
  Website: '🌐 Website',
  Other: '📌 Other',
}

export default async function PulsePage({ params }: Props) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: studio } = await admin
    .from('studios')
    .select('id, brand_color')
    .eq('slug', slug)
    .single()

  if (!studio) notFound()

  const { data: userRecord } = await admin
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single()

  if (!userRecord?.client_id) redirect('/login')

  const { data: pulses } = await admin
    .from('weekly_pulses')
    .select('*')
    .eq('client_id', userRecord.client_id)
    .order('week_start', { ascending: false })
    .limit(8)

  const accent = studio.brand_color ?? '#6366f1'
  const completedPulses = pulses?.filter((p) => p.status === 'completed') ?? []
  const latestPulse = pulses?.[0] ?? null

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>Weekly Pulse</h1>
        <p className='text-sm text-gray-500 mt-1'>Your weekly business check-ins and insights.</p>
      </div>

      {!latestPulse && (
        <div className='rounded-xl border bg-white px-6 py-12 text-center'>
          <p className='text-gray-500 text-sm'>No pulse check-ins yet. Your studio will send one soon.</p>
        </div>
      )}

      {latestPulse && latestPulse.status === 'in_progress' && (
        <div className='rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-4'>
          <p className='text-sm font-medium text-yellow-800'>Check-in in progress</p>
          <p className='text-xs text-yellow-700 mt-0.5'>
            Week of {new Date(latestPulse.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — check your email to complete it.
          </p>
        </div>
      )}

      {completedPulses.map((pulse, i) => (
        <div key={pulse.id} className='rounded-xl border bg-white overflow-hidden'>
          {/* Header */}
          <div className='px-5 py-4 border-b flex items-center justify-between'>
            <div>
              <p className='text-sm font-semibold text-gray-900'>
                Week of {new Date(pulse.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              {i === 0 && <p className='text-xs text-gray-400 mt-0.5'>Most recent</p>}
            </div>
            <Badge variant='default'>Completed</Badge>
          </div>

          <div className='px-5 py-5 space-y-5'>
            {/* Stats row */}
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
              <div className='rounded-lg bg-gray-50 px-3 py-3'>
                <p className='text-xs text-gray-500'>New inquiries</p>
                <p className='text-2xl font-bold text-gray-900 mt-0.5'>{pulse.leads_count ?? '—'}</p>
              </div>
              <div className='rounded-lg bg-gray-50 px-3 py-3'>
                <p className='text-xs text-gray-500'>Top source</p>
                <p className='text-sm font-medium text-gray-900 mt-0.5'>
                  {pulse.lead_source ? (SOURCE_LABELS[pulse.lead_source] ?? pulse.lead_source) : '—'}
                </p>
              </div>
              <div className='rounded-lg bg-gray-50 px-3 py-3 col-span-2'>
                <p className='text-xs text-gray-500'>Marketing activity</p>
                <p className='text-sm text-gray-700 mt-0.5'>{pulse.marketing_activity ?? '—'}</p>
              </div>
            </div>

            {/* Insight */}
            {pulse.summary && (
              <div
                className='rounded-lg px-4 py-4 space-y-2'
                style={{ background: `${accent}10`, borderLeft: `3px solid ${accent}` }}
              >
                <p className='text-sm text-gray-800'>{pulse.summary}</p>
                {pulse.recommendation && (
                  <p className='text-sm font-medium' style={{ color: accent }}>
                    → {pulse.recommendation}
                  </p>
                )}
              </div>
            )}

            {/* Blockers */}
            {pulse.blockers && pulse.blockers.toLowerCase() !== 'no' && (
              <div className='rounded-lg border border-orange-100 bg-orange-50 px-4 py-3'>
                <p className='text-xs font-medium text-orange-700 mb-0.5'>Blocker noted</p>
                <p className='text-sm text-orange-800'>{pulse.blockers}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
