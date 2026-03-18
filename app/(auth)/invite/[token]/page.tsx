import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import AcceptInviteForm from './accept-invite-form'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: invitation } = await admin
    .from('invitations')
    .select('id, email, accepted_at, expires_at, client_id')
    .eq('token', token)
    .single()

  if (!invitation) notFound()

  if (invitation.accepted_at) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <p className='text-lg font-semibold text-gray-900'>Invitation already used</p>
          <p className='text-sm text-gray-500 mt-1'>This invite link has already been accepted.</p>
        </div>
      </div>
    )
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <p className='text-lg font-semibold text-gray-900'>Invitation expired</p>
          <p className='text-sm text-gray-500 mt-1'>Please ask your agency to send a new invite.</p>
        </div>
      </div>
    )
  }

  const { data: client } = await admin
    .from('clients')
    .select('business_name, contact_name, studio_id')
    .eq('id', invitation.client_id)
    .single()

  const { data: studio } = client?.studio_id
    ? await admin
        .from('studios')
        .select('name, brand_color, slug')
        .eq('id', client.studio_id)
        .single()
    : { data: null }

  return (
    <AcceptInviteForm
      token={token}
      email={invitation.email}
      contactName={client?.contact_name ?? ''}
      businessName={client?.business_name ?? ''}
      studioName={studio?.name ?? ''}
      brandColor={studio?.brand_color ?? '#6366f1'}
      studioSlug={studio?.slug ?? ''}
    />
  )
}
