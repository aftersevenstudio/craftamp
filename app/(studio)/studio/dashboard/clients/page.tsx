import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Client, Invitation } from '@/types'

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: userRecord } = await admin
    .from('users')
    .select('studio_id')
    .eq('id', user.id)
    .single()

  const studioId = userRecord?.studio_id

  const { data: clients } = studioId
    ? await admin
        .from('clients')
        .select('*')
        .eq('studio_id', studioId)
        .order('created_at', { ascending: false })
    : { data: [] }

  const clientIds = (clients ?? []).map((c: Client) => c.id)

  const { data: invitations } = clientIds.length
    ? await admin
        .from('invitations')
        .select('client_id, accepted_at')
        .in('client_id', clientIds)
    : { data: [] }

  const inviteMap = new Map<string, Invitation | null>()
  for (const inv of invitations ?? []) {
    if (!inviteMap.has(inv.client_id)) {
      inviteMap.set(inv.client_id, inv as Invitation)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <header className='bg-white border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <Link href='/studio/dashboard' className='text-sm text-gray-500 hover:text-gray-700'>
              Dashboard
            </Link>
            <span className='text-gray-300'>/</span>
            <span className='text-sm font-medium text-gray-900'>Clients</span>
          </div>
          <Link href='/studio/dashboard/clients/new'>
            <Button size='sm'>Invite client</Button>
          </Link>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <h1 className='text-2xl font-bold text-gray-900 mb-6'>Clients</h1>

        {!clients?.length ? (
          <Card>
            <CardContent className='py-16 text-center'>
              <p className='text-gray-500 mb-4'>No clients yet.</p>
              <Link href='/studio/dashboard/clients/new'>
                <Button>Invite your first client</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-3'>
            {(clients as Client[]).map((client) => {
              const invite = inviteMap.get(client.id)
              const status = !invite ? 'no invite' : invite.accepted_at ? 'active' : 'invited'

              return (
                <Link key={client.id} href={`/studio/dashboard/clients/${client.id}`}>
                  <Card className='hover:shadow-sm transition-shadow cursor-pointer'>
                    <CardContent className='py-4 flex items-center justify-between'>
                      <div>
                        <p className='font-medium text-gray-900'>{client.business_name}</p>
                        <p className='text-sm text-gray-500'>
                          {client.contact_name} · {client.contact_email}
                        </p>
                      </div>
                      <div className='flex items-center gap-2'>
                        {client.ga4_property_id && (
                          <span className='text-xs text-gray-400'>GA4 ✓</span>
                        )}
                        <Badge variant={status === 'active' ? 'default' : 'secondary'}>
                          {status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
