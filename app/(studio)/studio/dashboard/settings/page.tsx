import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import StudioSettingsForm from './studio-settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: userRecord } = await admin
    .from('users')
    .select('studio_id, role')
    .eq('id', user.id)
    .single()

  if (!userRecord || userRecord.role !== 'studio_admin' || !userRecord.studio_id) {
    redirect('/studio/dashboard')
  }

  const { data: studio } = await admin
    .from('studios')
    .select('id, name, slug, logo_url, brand_color, custom_domain')
    .eq('id', userRecord.studio_id)
    .single()

  if (!studio) redirect('/studio/dashboard')

  return (
    <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-2'>
      <h1 className='text-2xl font-bold text-gray-900 mb-6'>Studio settings</h1>
      <StudioSettingsForm
        studioId={studio.id}
        studioName={studio.name}
        logoUrl={studio.logo_url}
        brandColor={studio.brand_color}
        customDomain={studio.custom_domain}
        portalUrl={`https://${studio.slug}.craftamp.com`}
      />
    </main>
  )
}
