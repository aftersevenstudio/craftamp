import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SignOutButton from '@/components/ui/sign-out-button'
import StudioNav from './studio-nav'

export default async function StudioDashboardLayout({ children }: { children: React.ReactNode }) {
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

  const accent = studio?.brand_color ?? '#5046E4'

  return (
    <div className='min-h-screen bg-gray-50'>
      <header className='bg-white border-b sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0 flex items-center justify-between h-14'>
          <div className='flex items-center gap-6'>
            <span className='text-sm font-semibold text-gray-900'>
              {studio?.name ?? 'Studio'}
            </span>
            <StudioNav />
          </div>
          <div className='flex items-center gap-3'>
            <span className='hidden sm:block text-xs text-gray-400'>{user.email}</span>
            <SignOutButton />
          </div>
        </div>
        <div className='h-0.5 w-full' style={{ background: accent }} />
      </header>

      {children}
    </div>
  )
}
