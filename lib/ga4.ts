import { createAdminClient } from '@/lib/supabase/admin'

export interface GA4Metrics {
  sessions: number
  totalUsers: number
  newUsers: number
  bounceRate: number
  avgSessionDuration: number // seconds
  pageviews: number
  topPages: { path: string; views: number }[]
  deviceBreakdown: { mobile: number; desktop: number; tablet: number }
  daysWithData: number      // how many days in the period had at least 1 session
  sufficientData: boolean   // true if sessions > 0 AND daysWithData >= 14
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.access_token ?? null
}

export async function fetchGA4Metrics(
  studioId: string,
  ga4PropertyId: string,
  periodMonth: string // YYYY-MM
): Promise<GA4Metrics | null> {
  const admin = createAdminClient()

  const { data: integration } = await admin
    .from('integrations')
    .select('access_token, refresh_token, expires_at')
    .eq('studio_id', studioId)
    .eq('provider', 'google_analytics')
    .single()

  if (!integration) return null

  // Refresh token if expired (or within 60s of expiry)
  let accessToken = integration.access_token
  const expiresAt = integration.expires_at ? new Date(integration.expires_at).getTime() : 0
  if (Date.now() >= expiresAt - 60_000) {
    if (!integration.refresh_token) return null
    const newToken = await refreshAccessToken(integration.refresh_token)
    if (!newToken) return null
    accessToken = newToken

    const newExpiry = new Date(Date.now() + 3600 * 1000).toISOString()
    await admin
      .from('integrations')
      .update({ access_token: newToken, expires_at: newExpiry })
      .eq('studio_id', studioId)
      .eq('provider', 'google_analytics')
  }

  // Build date range from YYYY-MM
  const [year, month] = periodMonth.split('-').map(Number)
  const startDate = `${periodMonth}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${periodMonth}-${String(lastDay).padStart(2, '0')}`

  const propertyId = `properties/${ga4PropertyId}`
  const apiUrl = `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`

  // Main metrics report
  const metricsRes = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'screenPageViews' },
      ],
    }),
  })

  if (!metricsRes.ok) {
    const errText = await metricsRes.text()
    console.error(`[ga4] metrics fetch failed for property "${ga4PropertyId}" (status ${metricsRes.status}):`, errText)
    return null
  }

  const metricsData = await metricsRes.json()
  const row = metricsData.rows?.[0]?.metricValues

  // No rows means zero sessions for the period — return zero metrics rather than null
  // so callers can distinguish "connected but no data" from "not configured"
  const sessions = row ? Math.round(Number(row[0]?.value ?? 0)) : 0
  const totalUsers = row ? Math.round(Number(row[1]?.value ?? 0)) : 0
  const newUsers = row ? Math.round(Number(row[2]?.value ?? 0)) : 0
  const bounceRate = row ? Math.round(Number(row[3]?.value ?? 0) * 100) : 0
  const avgSessionDuration = row ? Math.round(Number(row[4]?.value ?? 0)) : 0
  const pageviews = row ? Math.round(Number(row[5]?.value ?? 0)) : 0

  // Top pages report
  const pagesRes = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 3,
    }),
  })

  const topPages: { path: string; views: number }[] = []
  if (pagesRes.ok) {
    const pagesData = await pagesRes.json()
    for (const r of pagesData.rows ?? []) {
      topPages.push({
        path: r.dimensionValues?.[0]?.value ?? '/',
        views: Math.round(Number(r.metricValues?.[0]?.value ?? 0)),
      })
    }
  }

  // Device breakdown
  const deviceRes = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'sessions' }],
    }),
  })

  const deviceBreakdown = { mobile: 0, desktop: 0, tablet: 0 }
  if (deviceRes.ok) {
    const deviceData = await deviceRes.json()
    for (const r of deviceData.rows ?? []) {
      const category = r.dimensionValues?.[0]?.value?.toLowerCase() ?? ''
      const count = Math.round(Number(r.metricValues?.[0]?.value ?? 0))
      if (category === 'mobile') deviceBreakdown.mobile = count
      else if (category === 'desktop') deviceBreakdown.desktop = count
      else if (category === 'tablet') deviceBreakdown.tablet = count
    }
  }

  // Count how many days in the period had at least 1 session
  let daysWithData = 0
  const daysRes = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
  })
  if (daysRes.ok) {
    const daysData = await daysRes.json()
    daysWithData = (daysData.rows ?? []).filter(
      (r: { metricValues?: { value?: string }[] }) => Number(r.metricValues?.[0]?.value ?? 0) > 0
    ).length
  }

  return {
    sessions,
    totalUsers,
    newUsers,
    bounceRate,
    avgSessionDuration,
    pageviews,
    topPages,
    deviceBreakdown,
    daysWithData,
    sufficientData: sessions > 0 && daysWithData >= 14,
  }
}

export function formatGA4ForPrompt(metrics: GA4Metrics): string {
  const totalDevices = metrics.deviceBreakdown.mobile + metrics.deviceBreakdown.desktop + metrics.deviceBreakdown.tablet
  const mobilePct = totalDevices > 0 ? Math.round((metrics.deviceBreakdown.mobile / totalDevices) * 100) : 0
  const desktopPct = totalDevices > 0 ? Math.round((metrics.deviceBreakdown.desktop / totalDevices) * 100) : 0

  const mins = Math.floor(metrics.avgSessionDuration / 60)
  const secs = metrics.avgSessionDuration % 60
  const durationStr = `${mins}m ${secs}s`

  const topPagesStr = metrics.topPages
    .map((p) => `  - ${p.path} (${p.views.toLocaleString()} views)`)
    .join('\n')

  return `REAL GA4 DATA (use these exact figures — do NOT fabricate numbers):
- Sessions: ${metrics.sessions.toLocaleString()}
- Total users: ${metrics.totalUsers.toLocaleString()}
- New users: ${metrics.newUsers.toLocaleString()}
- Pageviews: ${metrics.pageviews.toLocaleString()}
- Bounce rate: ${metrics.bounceRate}%
- Avg session duration: ${durationStr}
- Mobile vs Desktop: ${mobilePct}% mobile / ${desktopPct}% desktop
- Top pages by views:
${topPagesStr || '  - (no page data)'}`
}
