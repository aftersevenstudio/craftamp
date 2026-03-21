import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import EditClientForm from './edit-client-form'
import OpportunitiesPanel from './opportunities-panel'
import PulsePanel from './pulse-panel'
import DeleteClientButton from './delete-client-button'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ga_connected?: string; ga_error?: string }>
}

export default async function ClientSettingsPage({ params, searchParams }: Props) {
  const { id } = await params
  const { ga_connected, ga_error } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: userRecord } = await admin
    .from('users')
    .select('studio_id')
    .eq('id', user.id)
    .single()

  const { data: client } = await admin
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('studio_id', userRecord?.studio_id)
    .single()

  if (!client) notFound()

  // Check if Google Analytics is connected for this studio
  const { data: gaIntegration } = await admin
    .from('integrations')
    .select('id, expires_at, created_at')
    .eq('studio_id', userRecord?.studio_id)
    .eq('provider', 'google_analytics')
    .single()

  const isGAConnected = !!gaIntegration

  const { data: opportunities } = await admin
    .from('opportunities')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  const { data: latestPulse } = await admin
    .from('weekly_pulses')
    .select('*')
    .eq('client_id', id)
    .order('week_start', { ascending: false })
    .limit(1)
    .single()

  const returnTo = `/studio/dashboard/clients/${id}`

  return (
    <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8'>

        {/* OAuth result banners */}
        {ga_connected && (
          <div className='rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800'>
            ✓ Google Analytics connected successfully.
          </div>
        )}
        {ga_error && (
          <div className='rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800'>
            Google Analytics connection failed: {ga_error.replace(/_/g, ' ')}. Please try again.
          </div>
        )}

        {/* Client info */}
        <EditClientForm client={client} />

        {/* Integrations */}
        <div className='space-y-4'>
          <h2 className='text-base font-semibold text-gray-900'>Integrations</h2>

          <div className='bg-white rounded-xl border divide-y'>
            {/* Google Analytics */}
            <div className='flex items-center justify-between px-5 py-4'>
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 rounded-md bg-orange-50 flex items-center justify-center text-base'>
                  📊
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-900'>Google Analytics</p>
                  <p className='text-xs text-gray-500'>
                    {isGAConnected
                      ? 'Connected — pulls real GA4 data into reports'
                      : 'Connect once for all clients in your studio'}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                {isGAConnected ? (
                  <Badge variant='default'>Connected</Badge>
                ) : (
                  <a href={`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`}>
                    <button className='text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 px-3 py-1.5 rounded-md transition-colors'>
                      Connect
                    </button>
                  </a>
                )}
              </div>
            </div>

            {/* Google Business Profile — coming soon */}
            <div className='flex items-center justify-between px-5 py-4 opacity-50'>
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center text-base'>
                  📍
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-900'>Google Business Profile</p>
                  <p className='text-xs text-gray-500'>Local presence data — coming soon</p>
                </div>
              </div>
              <Badge variant='secondary'>Soon</Badge>
            </div>
          </div>
        </div>

        {/* Weekly Pulse */}
        <PulsePanel
          clientId={id}
          hasEmail={!!client.contact_email}
          latestPulse={latestPulse ?? null}
        />

        {/* Opportunities */}
        <OpportunitiesPanel
          clientId={id}
          initialOpportunities={opportunities ?? []}
        />

        {/* Danger zone */}
        <DeleteClientButton clientId={id} businessName={client.business_name} />

      </main>
  )
}
