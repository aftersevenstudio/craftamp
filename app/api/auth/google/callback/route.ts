import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/studio/dashboard?ga_error=access_denied`)
  }

  let studioId: string
  let returnTo: string

  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    studioId = decoded.studioId
    returnTo = decoded.returnTo ?? '/studio/dashboard'
  } catch {
    return NextResponse.redirect(`${appUrl}/studio/dashboard?ga_error=invalid_state`)
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${appUrl}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    console.error('[google callback] token exchange failed:', await tokenRes.text())
    return NextResponse.redirect(`${appUrl}/studio/dashboard?ga_error=token_exchange`)
  }

  const tokens = await tokenRes.json()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const admin = createAdminClient()

  // Upsert the integration — one Google Analytics connection per studio
  const { error: upsertError } = await admin
    .from('integrations')
    .upsert(
      {
        studio_id: studioId,
        client_id: null,
        provider: 'google_analytics',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: expiresAt,
      },
      { onConflict: 'studio_id,provider' }
    )

  if (upsertError) {
    console.error('[google callback] upsert error:', upsertError)
    return NextResponse.redirect(`${appUrl}${returnTo}?ga_error=save_failed`)
  }

  return NextResponse.redirect(`${appUrl}${returnTo}?ga_connected=1`)
}
