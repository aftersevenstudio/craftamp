import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpportunitiesClient from './opportunities-client'

interface Props {
  params: Promise<{ slug: string }>
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
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>Growth Opportunities</h1>
        <p className='text-sm text-gray-500 mt-1'>
          Actionable recommendations based on your reports and weekly check-ins.
        </p>
      </div>

      <OpportunitiesClient initialOpportunities={opportunities ?? []} />
    </div>
  )
}
