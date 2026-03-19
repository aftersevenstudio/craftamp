import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rulesFromPulse, rulesFromReport, generateWithAI, syncOpportunities } from '@/lib/opportunities-engine'

async function getStudioId(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('users').select('studio_id, role').eq('id', userId).single()
  return data?.role === 'studio_admin' ? data.studio_id : null
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studioId = await getStudioId(user.id)
  if (!studioId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const { data: client } = await admin
    .from('clients')
    .select('id, business_name, business_type, primary_goal')
    .eq('id', clientId)
    .eq('studio_id', studioId)
    .single()

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const clientProfile = {
    business_name: client.business_name,
    business_type: client.business_type ?? null,
    primary_goal: client.primary_goal ?? null,
  }

  // Fetch latest completed pulse
  const { data: latestPulse } = await admin
    .from('weekly_pulses')
    .select('client_id, leads_count, lead_source, marketing_activity, blockers')
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .order('week_start', { ascending: false })
    .limit(1)
    .single()

  // Fetch latest report sections
  const { data: latestReport } = await admin
    .from('reports')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'sent')
    .order('period_month', { ascending: false })
    .limit(1)
    .single()

  let reportSections: { section_type: string; ai_content: string | null }[] = []
  let reportSummary: string | null = null

  if (latestReport) {
    const { data: sections } = await admin
      .from('report_sections')
      .select('section_type, ai_content')
      .eq('report_id', latestReport.id)

    reportSections = sections ?? []
    reportSummary = sections?.find((s) => s.section_type === 'executive_summary')?.ai_content ?? null
  }

  // Generate from both sources
  const pulseRules = latestPulse ? rulesFromPulse(latestPulse) : []
  const reportRules = rulesFromReport(reportSections, null)

  const [pulseOpps, reportOpps] = await Promise.all([
    latestPulse
      ? generateWithAI(clientProfile, latestPulse, null, pulseRules)
      : Promise.resolve([]),
    generateWithAI(clientProfile, null, reportSummary, reportRules),
  ])

  await Promise.all([
    latestPulse ? syncOpportunities(clientId, pulseOpps, 'pulse', admin) : Promise.resolve(),
    syncOpportunities(clientId, reportOpps, 'report', admin),
  ])

  return NextResponse.json({ ok: true, pulse: pulseOpps.length, report: reportOpps.length })
}
