import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function StudioDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userRecord } = await supabase
    .from('users')
    .select('*, studios(*)')
    .eq('id', user.id)
    .single()

  const studioName = (userRecord as any)?.studios?.name ?? 'Your Studio'

  return (
    <div className='min-h-screen bg-gray-50'>
      <header className='bg-white border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between'>
          <h1 className='text-xl font-semibold text-gray-900'>{studioName}</h1>
          <span className='text-sm text-gray-500'>{user.email}</span>
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
        </div>
      </main>
    </div>
  )
}
