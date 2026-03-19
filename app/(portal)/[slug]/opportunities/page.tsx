import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  params: Promise<{ slug: string }>
}

const TYPE_LABELS: Record<string, string> = {
  local_event: 'Local Event',
  partnership: 'Partnership',
  marketing: 'Marketing',
  website: 'Website',
  review: 'Reviews',
  social: 'Social Media',
  general: 'General',
}

const TYPE_COLORS: Record<string, string> = {
  local_event: 'bg-purple-100 text-purple-700',
  partnership: 'bg-blue-100 text-blue-700',
  marketing: 'bg-orange-100 text-orange-700',
  website: 'bg-cyan-100 text-cyan-700',
  review: 'bg-yellow-100 text-yellow-700',
  social: 'bg-pink-100 text-pink-700',
  general: 'bg-gray-100 text-gray-700',
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
        <h1 className='text-2xl font-bold text-gray-900'>Opportunities</h1>
        <p className='text-sm text-gray-500 mt-1'>
          Curated growth opportunities from your agency.
        </p>
      </div>

      {!opportunities?.length ? (
        <Card>
          <CardContent className='py-16 text-center'>
            <p className='text-gray-400 text-sm'>No opportunities yet — check back soon.</p>
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
                {section.items.map((opp) => (
                  <Card key={opp.id} className={opp.status === 'completed' ? 'opacity-60' : ''}>
                    <CardContent className='py-4 px-5'>
                      <div className='flex items-start justify-between gap-4'>
                        <div className='flex-1'>
                          <div className='flex items-center gap-2 mb-1'>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[opp.type] ?? TYPE_COLORS.general}`}>
                              {TYPE_LABELS[opp.type] ?? opp.type}
                            </span>
                          </div>
                          <p className={`text-sm font-semibold ${opp.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            {opp.title}
                          </p>
                          {opp.description && (
                            <p className='text-sm text-gray-500 mt-1 leading-relaxed'>{opp.description}</p>
                          )}
                        </div>
                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[opp.status] ?? STATUS_COLORS.open}`}>
                          {STATUS_LABELS[opp.status] ?? opp.status}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
