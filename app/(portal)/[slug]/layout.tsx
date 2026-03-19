import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SignOutButton from '@/components/ui/sign-out-button'

interface Props {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function PortalLayout({ children, params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: studio } = await admin
    .from('studios')
    .select('id, name, brand_color, logo_url')
    .eq('slug', slug)
    .single()

  if (!studio) redirect('/login')

  const { data: userRecord } = await admin
    .from('users')
    .select('role, studio_id, client_id')
    .eq('id', user.id)
    .single()

  // Must be a client_user belonging to this studio
  if (!userRecord || userRecord.role !== 'client_user' || userRecord.studio_id !== studio.id) {
    redirect('/login')
  }

  const accent = studio.brand_color ?? '#6366f1'

  const navLinks = [
    { href: `/${slug}/overview`, label: 'Overview' },
    { href: `/${slug}/reports`, label: 'Reports' },
    { href: `/${slug}/opportunities`, label: 'Opportunities' },
    { href: `/${slug}/pulse`, label: 'Pulse' },
  ]

  return (
    <div className='min-h-screen bg-gray-50'>
      <header className='bg-white border-b sticky top-0 z-10'>
        <div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-14'>
            {/* Studio name / logo */}
            <div className='flex items-center gap-2'>
              {studio.logo_url ? (
                <img src={studio.logo_url} alt={studio.name} className='h-8 w-auto max-w-[180px] object-contain' />
              ) : (
                <span
                  className='text-sm font-bold tracking-tight'
                  style={{ color: accent }}
                >
                  {studio.name}
                </span>
              )}
            </div>

            {/* Nav */}
            <div className='flex items-center gap-1'>
              <nav className='flex items-center gap-1'>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className='px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors'
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className='ml-2 pl-2 border-l'>
                <SignOutButton />
              </div>
            </div>
          </div>
        </div>

        {/* Brand color bar */}
        <div className='h-0.5 w-full' style={{ background: accent }} />
      </header>

      <main className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {children}
      </main>
    </div>
  )
}
