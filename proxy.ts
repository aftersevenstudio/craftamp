import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const APP_HOST = process.env.NEXT_PUBLIC_APP_URL
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
  : 'localhost'

// Portal paths that should be served on custom domains
const PORTAL_PATHS = ['/overview', '/reports', '/opportunities']

async function resolveCustomDomain(host: string, appUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${appUrl}/api/internal/domain?host=${encodeURIComponent(host)}`)
    const data = await res.json()
    return data.slug ?? null
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase() ?? ''
  const { pathname } = request.nextUrl
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Custom domain handling — skip if on the main app host or a local/vercel domain
  const isMainHost =
    host === APP_HOST ||
    host === 'localhost' ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.craftamp.com')

  if (!isMainHost && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const slug = await resolveCustomDomain(host, appUrl)

    if (slug) {
      const url = request.nextUrl.clone()

      // Root → redirect to /overview
      if (pathname === '/') {
        url.pathname = `/${slug}/overview`
        return NextResponse.redirect(url)
      }

      // Rewrite known portal paths to include the slug
      const isPortalPath = PORTAL_PATHS.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
      )

      if (isPortalPath) {
        url.pathname = `/${slug}${pathname}`
        return NextResponse.rewrite(url)
      }

      // /login and /api/* pass through unchanged
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
