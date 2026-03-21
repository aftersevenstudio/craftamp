import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SignOutButton from '@/components/ui/sign-out-button'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function StudioDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: userRecord } = await admin
    .from('users')
    .select('studio_id, role')
    .eq('id', user.id)
    .single()

  if (userRecord?.role === 'client_user') {
    const { data: studio } = userRecord.studio_id
      ? await admin.from('studios').select('slug').eq('id', userRecord.studio_id).single()
      : { data: null }
    redirect(studio?.slug ? `/${studio.slug}/overview` : '/login')
  }

  const { data: studio } = userRecord?.studio_id
    ? await admin.from('studios').select('name, brand_color').eq('id', userRecord.studio_id).single()
    : { data: null }

  const studioId = userRecord?.studio_id
  const accent = studio?.brand_color ?? '#5046E4'

  // Fetch all client IDs for this studio
  const { data: clients } = studioId
    ? await admin.from('clients').select('id, business_name').eq('studio_id', studioId)
    : { data: [] }

  const clientIds = (clients ?? []).map((c) => c.id)
  const clientMap = new Map((clients ?? []).map((c) => [c.id, c.business_name]))

  // Stats
  const monthStart = new Date()
  monthStart.setDate(1)
  const monthStartStr = monthStart.toISOString().split('T')[0]

  const [
    { count: reportsSentCount },
    { count: openOppsCount },
    { count: pulsesThisMonth },
    { data: recentReports },
    { data: pendingOpps },
  ] = await Promise.all([
    clientIds.length
      ? admin.from('reports').select('id', { count: 'exact', head: true }).in('client_id', clientIds).eq('status', 'sent')
      : Promise.resolve({ count: 0 }),
    clientIds.length
      ? admin.from('opportunities').select('id', { count: 'exact', head: true }).in('client_id', clientIds).eq('status', 'open')
      : Promise.resolve({ count: 0 }),
    clientIds.length
      ? admin.from('weekly_pulses').select('id', { count: 'exact', head: true }).in('client_id', clientIds).eq('status', 'completed').gte('week_start', monthStartStr)
      : Promise.resolve({ count: 0 }),
    clientIds.length
      ? admin.from('reports').select('id, client_id, period_month, sent_at').in('client_id', clientIds).eq('status', 'sent').order('sent_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    clientIds.length
      ? admin.from('opportunities').select('id, client_id, title, type').in('client_id', clientIds).eq('status', 'open').order('created_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
  ])

  const stats = [
    {
      label: 'Total clients',
      value: clientIds.length,
      href: '/studio/dashboard/clients',
      description: 'Active portals',
    },
    {
      label: 'Reports sent',
      value: reportsSentCount ?? 0,
      href: '/studio/dashboard/reports',
      description: 'All time',
    },
    {
      label: 'Pulse check-ins',
      value: pulsesThisMonth ?? 0,
      href: '/studio/dashboard/clients',
      description: 'Completed this month',
    },
    {
      label: 'Open opportunities',
      value: openOppsCount ?? 0,
      href: '/studio/dashboard/clients',
      description: 'Awaiting action',
    },
  ]

  const navItems = [
    { href: '/studio/dashboard/clients', label: 'Clients', description: 'Manage clients and their portals' },
    { href: '/studio/dashboard/reports', label: 'Reports', description: 'Generate and send monthly reports' },
    { href: '/studio/dashboard/settings', label: 'Settings', description: 'Branding, logo, and custom domain' },
  ]

  return (
    <div className='min-h-screen bg-gray-50'>
      <header className='bg-white border-b sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between'>
          <span className='text-sm font-semibold text-gray-900'>{studio?.name ?? 'Studio'}</span>
          <div className='flex items-center gap-4'>
            <nav className='hidden sm:flex items-center gap-1'>
              {navItems.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className='px-3 py-1.5 rounded-md text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors'
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className='pl-3 border-l'>
              <SignOutButton />
            </div>
          </div>
        </div>
        <div className='h-0.5 w-full' style={{ background: accent }} />
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10'>

        {/* Greeting */}
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>
            {greeting()}, {user.email?.split('@')[0]}.
          </h1>
          <p className='mt-1 text-sm text-gray-500'>Here's what's happening across your clients.</p>
        </div>

        {/* Stat cards */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
          {stats.map((s) => (
            <Link key={s.label} href={s.href}>
              <div className='bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow'>
                <p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>{s.label}</p>
                <p className='mt-2 text-3xl font-bold text-gray-900'>{s.value}</p>
                <p className='mt-1 text-xs text-gray-400'>{s.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Activity + Opportunities */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>

          {/* Recent reports sent */}
          <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
            <div className='flex items-center justify-between px-5 py-4 border-b'>
              <h2 className='text-sm font-semibold text-gray-900'>Recent reports sent</h2>
              <Link href='/studio/dashboard/reports' className='text-xs text-gray-400 hover:text-gray-600'>
                View all →
              </Link>
            </div>
            {recentReports && recentReports.length > 0 ? (
              <ul className='divide-y'>
                {recentReports.map((r) => {
                  const [year, month] = r.period_month.split('-')
                  const period = new Date(Number(year), Number(month) - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
                  const sentDate = r.sent_at ? new Date(r.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/studio/dashboard/reports/${r.id}`}
                        className='flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors'
                      >
                        <div>
                          <p className='text-sm font-medium text-gray-900'>{clientMap.get(r.client_id) ?? 'Unknown'}</p>
                          <p className='text-xs text-gray-400'>{period}</p>
                        </div>
                        <span className='text-xs text-gray-400'>{sentDate}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className='px-5 py-10 text-center'>
                <p className='text-sm text-gray-400'>No reports sent yet.</p>
                <Link href='/studio/dashboard/reports/new' className='mt-2 inline-block text-xs text-indigo-500 hover:underline'>
                  Generate your first report →
                </Link>
              </div>
            )}
          </div>

          {/* Open opportunities */}
          <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
            <div className='flex items-center justify-between px-5 py-4 border-b'>
              <h2 className='text-sm font-semibold text-gray-900'>Open opportunities</h2>
              <Link href='/studio/dashboard/clients' className='text-xs text-gray-400 hover:text-gray-600'>
                View clients →
              </Link>
            </div>
            {pendingOpps && pendingOpps.length > 0 ? (
              <ul className='divide-y'>
                {pendingOpps.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/studio/dashboard/clients/${o.client_id}`}
                      className='flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors'
                    >
                      <div>
                        <p className='text-sm font-medium text-gray-900'>{o.title}</p>
                        <p className='text-xs text-gray-400'>{clientMap.get(o.client_id) ?? 'Unknown'}</p>
                      </div>
                      <span className='text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize'>
                        {o.type?.replace('_', ' ')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className='px-5 py-10 text-center'>
                <p className='text-sm text-gray-400'>No open opportunities.</p>
              </div>
            )}
          </div>

        </div>

        {/* Quick nav */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          {navItems.map((n) => (
            <Link key={n.href} href={n.href}>
              <div className='bg-white rounded-xl border border-gray-200 px-5 py-4 hover:shadow-sm transition-shadow flex items-center justify-between'>
                <div>
                  <p className='text-sm font-semibold text-gray-900'>{n.label}</p>
                  <p className='text-xs text-gray-400 mt-0.5'>{n.description}</p>
                </div>
                <span className='text-gray-300 text-lg'>→</span>
              </div>
            </Link>
          ))}
        </div>

      </main>
    </div>
  )
}
