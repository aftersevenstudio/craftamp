import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchGA4Metrics } from '@/lib/ga4'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: userRecord } = await admin
    .from('users')
    .select('studio_id, role')
    .eq('id', user.id)
    .single()

  if (!userRecord || userRecord.role !== 'studio_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: client } = await admin
    .from('clients')
    .select('ga4_property_id, business_name')
    .eq('id', id)
    .eq('studio_id', userRecord.studio_id)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  if (!client.ga4_property_id) {
    return NextResponse.json({ ok: false, reason: 'no_property_id', message: 'No GA4 property ID is set for this client.' })
  }

  // Warn if they passed a Measurement ID instead of a Property ID
  if (/^G-/i.test(client.ga4_property_id)) {
    return NextResponse.json({
      ok: false,
      reason: 'wrong_id_format',
      message: `The stored value "${client.ga4_property_id}" looks like a Measurement ID (G-XXXXXXXX). The Data API requires a numeric Property ID. Find it in GA4 → Admin → Property Settings.`,
    })
  }

  // Test with the current month
  const now = new Date()
  const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const metrics = await fetchGA4Metrics(userRecord.studio_id, client.ga4_property_id, periodMonth)

  if (!metrics) {
    return NextResponse.json({
      ok: false,
      reason: 'fetch_failed',
      message: 'GA4 API call failed. Check Vercel logs for the detailed error. Common causes: wrong Property ID, OAuth token expired, or the connected Google account does not have access to this GA4 property.',
      propertyId: client.ga4_property_id,
    })
  }

  return NextResponse.json({
    ok: true,
    propertyId: client.ga4_property_id,
    periodMonth,
    metrics,
  })
}
