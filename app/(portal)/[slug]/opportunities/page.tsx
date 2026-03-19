import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  params: Promise<{ slug: string }>
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  // Auto-generated types
  growth: { label: 'Growth', color: 'bg-emerald-100 text-emerald-700', icon: '📈' },
  quick_win: { label: 'Quick Win', color: 'bg-amber-100 text-amber-700', icon: '⚡' },
  feedback: { label: 'Feedback', color: 'bg-purple-100 text-purple-700', icon: '💬' },
  // Manual types (studio-created)
  local_event: { label: 'Local Event', color: 'bg-violet-100 text-violet-700', icon: '📍' },
  partnership: { label: 'Partnership', color: 'bg-blue-100 text-blue-700', icon: '🤝' },
  marketing: { label: 'Marketing', color: 'bg-orange-100 text-orange-700', icon: '📣' },
  website: { label: 'Website', color: 'bg-cyan-100 text-cyan-700', icon: '🌐' },
  review: { label: 'Reviews', color: 'bg-yellow-100 text-yellow-700', icon: '⭐' },
  social: { label: 'Social', color: 'bg-pink-100 text-pink-700', icon: '✨' },
  general: { label: 'General', color: 'bg-gray-100 text-gray-700', icon: '💡' },
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-500',
  dismissed: 'bg-gray-100 text-gray-400',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
  dismissed: 'Dismissed',
}

export default async function PortalOpportunitiesPage({ params }: Props) {
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

  const { data: opportunities } = clientId
    ? await admin
        .from('opportunities')
        .select('*')
        .eq('client_id', clientId)
        .neq('status', 'dismissed')
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('created_at', { ascending: false })
    : { data: [] }

  const open = (opportunities ?? []).filter((o) => o.status === 'open')
  const inProgress = (opportunities ?? []).filter((o) => o.status === 'in_progress')
  const completed = (opportunities ?? []).filter((o) => o.status === 'completed')

  const sections = [
    { label: 'Open', items: open },
    { label: 'In Progress', items: inProgress },
    { label: 'Completed', items: completed },
  ].filter((s) => s.items.length > 0)

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>Growth Opportunities</h1>
        <p className='text-sm text-gray-500 mt-1'>
          Actionable recommendations based on your reports and weekly check-ins.
        </p>
      </div>

      {!opportunities?.length ? (
        <Card>
          <CardContent className='py-16 text-center'>
            <p className='text-gray-400 text-sm'>No opportunities yet — check back after your first check-in or report.</p>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-8'>
          {sections.map((section) => (
            <div key={section.label}>
              <h2 className='text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3'>
                {section.label} · {section.items.length}
              </h2>
              <div className='space-y-3'>
                {section.items.map((opp) => {
                  const typeConfig = TYPE_CONFIG[opp.type] ?? TYPE_CONFIG.general
                  const isCompleted = opp.status === 'completed'
                  return (
                    <Card key={opp.id} className={isCompleted ? 'opacity-60' : ''}>
                      <CardContent className='py-4 px-5'>
                        <div className='flex items-start justify-between gap-4'>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-2 mb-2 flex-wrap'>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeConfig.color}`}>
                                {typeConfig.icon} {typeConfig.label}
                              </span>
                              {opp.source && opp.source !== 'manual' && (
                                <span className='text-xs text-gray-400'>
                                  From {opp.source === 'pulse' ? 'weekly check-in' : 'monthly report'}
                                </span>
                              )}
                            </div>
                            <p className={`text-sm font-semibold ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                              {opp.title}
                            </p>
                            {opp.description && (
                              <p className='text-sm text-gray-500 mt-1 leading-relaxed'>{opp.description}</p>
                            )}
                            {opp.cta_label && !isCompleted && (
                              <p className='text-xs font-medium text-indigo-600 mt-2'>→ {opp.cta_label}</p>
                            )}
                          </div>
                          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[opp.status] ?? STATUS_COLORS.open}`}>
                            {STATUS_LABELS[opp.status] ?? opp.status}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
