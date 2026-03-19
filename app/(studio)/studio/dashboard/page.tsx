import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SignOutButton from '@/components/ui/sign-out-button'
import Link from 'next/link'

export default async function StudioDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const admin = createAdminClient()

  const { data: userRecord } = await admin
    .from('users')
    .select('studio_id, role')
    .eq('id', user.id)
    .single()

  // Client users don't belong here — redirect them to their portal
  if (userRecord?.role === 'client_user') {
    const { data: studio } = userRecord.studio_id
      ? await admin.from('studios').select('slug').eq('id', userRecord.studio_id).single()
      : { data: null }
    redirect(studio?.slug ? `/${studio.slug}/overview` : '/login')
  }

  const { data: studio } = userRecord?.studio_id
    ? await admin.from('studios').select('name').eq('id', userRecord.studio_id).single()
    : { data: null }

  const studioName = studio?.name ?? 'Your Studio'

  return (
    <div className='min-h-screen bg-gray-50'>
      <header className='bg-white border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between'>
          <h1 className='text-xl font-semibold text-gray-900'>{studioName}</h1>
          <div className='flex items-center gap-3'>
            <span className='text-sm text-gray-500'>{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <h2 className='text-2xl font-bold text-gray-900 mb-6'>Dashboard</h2>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
          <Link href='/studio/dashboard/clients'>
            <Card className='hover:shadow-md transition-shadow cursor-pointer'>
              <CardHeader>
                <CardTitle>Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-gray-500'>Manage your clients and their portals.</p>
              </CardContent>
            </Card>
          </Link>

          <Link href='/studio/dashboard/reports'>
            <Card className='hover:shadow-md transition-shadow cursor-pointer'>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-gray-500'>View and generate monthly client reports.</p>
              </CardContent>
            </Card>
          </Link>

          <Link href='/studio/dashboard/settings'>
            <Card className='hover:shadow-md transition-shadow cursor-pointer'>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-gray-500'>Upload your logo and configure your studio's branding.</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  )
}
