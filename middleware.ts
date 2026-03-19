import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const MARKETING_HOSTS = ['craftamp.com', 'www.craftamp.com']

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const hostname = host.split(':')[0] // strip port for local dev

  // Marketing domain → serve the /home landing page
  if (MARKETING_HOSTS.includes(hostname)) {
    const url = request.nextUrl.clone()
    // Only rewrite the root; let static assets, api routes, etc. pass through
    if (url.pathname === '/' || url.pathname === '') {
      url.pathname = '/home'
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  // App domain (app.craftamp.com) and local dev → normal app routing with session handling
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
