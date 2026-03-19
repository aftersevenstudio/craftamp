import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const CRAFTAMP_DOMAIN = 'craftamp.com'
const APP_HOST = process.env.NEXT_PUBLIC_APP_URL
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
  : 'app.craftamp.com'

// Portal paths served under both /{slug}/path and (on subdomains) /path
const PORTAL_PATHS = ['/overview', '/reports', '/opportunities', '/pulse']

/** Returns the studio slug if the host is a studio subdomain (e.g. acme.craftamp.com), else null. */
function getSubdomainSlug(host: string): string | null {
  if (
    host === APP_HOST ||
    host === 'localhost' ||
    host.endsWith('.vercel.app') ||
    host === CRAFTAMP_DOMAIN ||
    host === `www.${CRAFTAMP_DOMAIN}`
  ) return null

  if (host.endsWith(`.${CRAFTAMP_DOMAIN}`)) {
    const slug = host.slice(0, -(`.${CRAFTAMP_DOMAIN}`.length))
    return slug || null
  }

  return null
}

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

  // ── Studio subdomain routing ({slug}.craftamp.com) ──────────────────────
  const subdomainSlug = getSubdomainSlug(host)
  if (subdomainSlug) {
    const url = request.nextUrl.clone()

    // Root → /overview
    if (pathname === '/') {
      url.pathname = '/overview'
      return NextResponse.redirect(url)
    }

    // Login → branded login (rewrite internally, URL stays /login)
    if (pathname === '/login') {
      url.searchParams.set('studio', subdomainSlug)
      return NextResponse.rewrite(url)
    }

    // Clean portal paths (/overview, /reports, etc.) → rewrite to /{slug}/path
    const isPortalPath = PORTAL_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    )
    if (isPortalPath) {
      url.pathname = `/${subdomainSlug}${pathname}`
      return NextResponse.rewrite(url)
    }

    // Strip redundant slug prefix if present (e.g. /acme/overview → /overview)
    // Happens when following old links or post-login redirects that include the slug
    if (pathname.startsWith(`/${subdomainSlug}/`)) {
      url.pathname = pathname.slice(subdomainSlug.length + 1) || '/'
      return NextResponse.redirect(url)
    }

    return updateSession(request)
  }

  // ── Custom domain routing (e.g. portal.client.com) ─────────────────────
  const isMainHost =
    host === APP_HOST ||
    host === 'localhost' ||
    host.endsWith('.vercel.app') ||
    host.endsWith(`.${CRAFTAMP_DOMAIN}`)

  if (!isMainHost && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const slug = await resolveCustomDomain(host, appUrl)

    if (slug) {
      const url = request.nextUrl.clone()

      if (pathname === '/') {
        url.pathname = `/${slug}/overview`
        return NextResponse.redirect(url)
      }

      const isPortalPath = PORTAL_PATHS.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
      )
      if (isPortalPath) {
        url.pathname = `/${slug}${pathname}`
        return NextResponse.rewrite(url)
      }
    }
  }

  // ── Default: Supabase session handling ──────────────────────────────────
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
