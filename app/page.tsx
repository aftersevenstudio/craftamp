import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: userRecord } = await admin
    .from('users')
    .select('role, studio_id, client_id')
    .eq('id', user.id)
    .single()

  if (!userRecord) redirect('/login')

  if (userRecord.role === 'client_user' && userRecord.studio_id) {
    const { data: studio } = await admin
      .from('studios')
      .select('slug')
      .eq('id', userRecord.studio_id)
      .single()
    redirect(studio?.slug ? `/${studio.slug}/overview` : '/login')
  }

  redirect('/studio/dashboard')
}
