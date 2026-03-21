import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SignOutButton from '@/components/ui/sign-out-button'
import PortalNav from './portal-nav'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const admin = createAdminClient()
  const { data: studio } = await admin.from('studios').select('name').eq('slug', slug).single()
  return {
    title: studio?.name ? `${studio.name} — Client Portal` : 'Client Portal',
  }
}

const CRAFTAMP_DOMAIN = 'craftamp.com'

function isStudioSubdomain(host: string): boolean {
  const bare = host.split(':')[0].toLowerCase()
  return (
    bare.endsWith(`.${CRAFTAMP_DOMAIN}`) &&
    bare !== `app.${CRAFTAMP_DOMAIN}` &&
    !bare.endsWith('.vercel.app')
  )
}

interface Props {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function PortalLayout({ children, params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const admin = createAdminClient()
  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  const onSubdomain = isStudioSubdomain(host)
  const basePath = onSubdomain ? '' : `/${slug}`

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
    { href: `${basePath}/overview`, label: 'Overview' },
    { href: `${basePath}/reports`, label: 'Reports' },
    { href: `${basePath}/opportunities`, label: 'Opportunities' },
    { href: `${basePath}/pulse`, label: 'Pulse' },
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
              <PortalNav links={navLinks} />
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
