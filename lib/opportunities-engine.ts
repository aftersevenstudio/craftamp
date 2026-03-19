import type { SupabaseClient } from '@supabase/supabase-js'
import { openai } from '@/lib/openai'
import type { GA4Metrics } from '@/lib/ga4'

export type OpportunityType = 'growth' | 'quick_win' | 'feedback'
export type OpportunitySource = 'report' | 'pulse' | 'manual'

export interface OpportunityInput {
  title: string
  description: string
  type: OpportunityType
  source: OpportunitySource
  cta_label: string
  expires_at: string
  metadata?: Record<string, unknown>
}

interface PulseData {
  client_id: string
  leads_count: number | null
  lead_source: string | null
  marketing_activity: string | null
  blockers: string | null
}

interface ReportSectionData {
  section_type: string
  ai_content: string | null
}

interface ClientProfile {
  business_name: string
  business_type: string | null
  primary_goal: string | null
}

// ─── Rule-based: from pulse ───────────────────────────────────────────────────

export function rulesFromPulse(pulse: PulseData): OpportunityInput[] {
  const opps: OpportunityInput[] = []
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const count = pulse.leads_count ?? 0
  const source = (pulse.lead_source ?? 'other').toLowerCase()
  const blockers = pulse.blockers ?? ''
  const marketing = pulse.marketing_activity ?? ''
  const hasBlocker = blockers.toLowerCase() !== 'no' && blockers.trim().length > 0
  const didMarketing = marketing.toLowerCase() !== 'no' && marketing.trim().length > 0

  // Lead volume signal
  if (count === 0) {
    opps.push({
      title: 'Re-engage your past contacts',
      description: 'It was a quiet week for new inquiries. Reach out to 3–5 past clients or warm leads to spark new conversations.',
      type: 'quick_win',
      source: 'pulse',
      cta_label: 'Discuss with your team',
      expires_at: expiresAt,
    })
  } else if (count >= 10) {
    opps.push({
      title: 'Scale what\'s driving your leads',
      description: `Strong week — ${count} new inquiries came in. Now is the time to increase investment in your top channel to maintain momentum.`,
      type: 'growth',
      source: 'pulse',
      cta_label: 'Review your strategy',
      expires_at: expiresAt,
    })
  }

  // Source-specific nudge
  if (count > 0) {
    if (source === 'instagram') {
      opps.push({
        title: 'Double down on Instagram',
        description: 'Instagram is your best lead source this week. Post 2–3 times with strong visuals and a direct call to action to keep the momentum going.',
        type: 'quick_win',
        source: 'pulse',
        cta_label: 'Plan your content',
        expires_at: expiresAt,
      })
    } else if (source === 'google') {
      opps.push({
        title: 'Strengthen your Google presence',
        description: 'Google is sending you leads. Keep your Business Profile current and ask a recent happy client for a review this week.',
        type: 'quick_win',
        source: 'pulse',
        cta_label: 'Review your GMB',
        expires_at: expiresAt,
      })
    } else if (source === 'referral') {
      opps.push({
        title: 'Activate your referral network',
        description: 'Referrals are your strongest channel right now. Reach out to your top 3 past clients and let them know you have availability.',
        type: 'growth',
        source: 'pulse',
        cta_label: 'Plan outreach',
        expires_at: expiresAt,
      })
    }
  }

  // Marketing gap
  if (!didMarketing && count < 5) {
    opps.push({
      title: 'Start with one marketing action',
      description: 'No marketing activity this week. Even one post, email, or message to past clients can drive new inquiries quickly.',
      type: 'quick_win',
      source: 'pulse',
      cta_label: 'Pick an action',
      expires_at: expiresAt,
    })
  }

  // Blocker flag
  if (hasBlocker) {
    opps.push({
      title: 'Remove a blocker slowing your growth',
      description: `You noted: "${blockers}". Clearing this could unlock progress — worth a conversation with your team.`,
      type: 'feedback',
      source: 'pulse',
      cta_label: 'Schedule a call',
      expires_at: expiresAt,
      metadata: { blockers },
    })
  }

  return opps.slice(0, 3)
}

// ─── Rule-based: from report ──────────────────────────────────────────────────

export function rulesFromReport(
  sections: ReportSectionData[],
  ga4: GA4Metrics | null
): OpportunityInput[] {
  const opps: OpportunityInput[] = []
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  if (ga4) {
    const mobile = ga4.deviceBreakdown.mobile
    const total = ga4.deviceBreakdown.mobile + ga4.deviceBreakdown.desktop + ga4.deviceBreakdown.tablet
    const mobilePercent = total > 0 ? Math.round((mobile / total) * 100) : 0

    if (ga4.bounceRate > 60) {
      opps.push({
        title: 'Reduce your website bounce rate',
        description: `${Math.round(ga4.bounceRate)}% of visitors are leaving without engaging. Review your homepage headline, load time, and primary call to action.`,
        type: 'quick_win',
        source: 'report',
        cta_label: 'Review your site',
        expires_at: expiresAt,
        metadata: { bounceRate: ga4.bounceRate },
      })
    }

    if (mobilePercent > 65) {
      opps.push({
        title: 'Optimise for your mobile visitors',
        description: `${mobilePercent}% of your traffic is on mobile. Make sure buttons are thumb-friendly, text is readable, and pages load in under 3 seconds.`,
        type: 'quick_win',
        source: 'report',
        cta_label: 'Test on mobile',
        expires_at: expiresAt,
        metadata: { mobilePercent },
      })
    }

    if (ga4.sessions > 0 && ga4.bounceRate <= 60) {
      opps.push({
        title: 'Convert more of your existing traffic',
        description: 'Your site is attracting visitors. Adding a clear offer or lead magnet to your top landing page could turn more browsers into inquiries.',
        type: 'growth',
        source: 'report',
        cta_label: 'Discuss with your team',
        expires_at: expiresAt,
      })
    }
  }

  // Content-based signals from report text
  const allContent = sections.map((s) => s.ai_content ?? '').join(' ').toLowerCase()

  if (allContent.includes('review') || allContent.includes('reputation')) {
    opps.push({
      title: 'Build your online reputation',
      description: 'Your report highlights a reputation opportunity. Ask your last 5 happy clients for a Google review — it directly impacts local search rankings.',
      type: 'quick_win',
      source: 'report',
      cta_label: 'Start collecting reviews',
      expires_at: expiresAt,
    })
  }

  if (allContent.includes('social') || allContent.includes('instagram') || allContent.includes('content')) {
    opps.push({
      title: 'Increase social media consistency',
      description: 'Your report shows social media could be working harder for you. Aim for 3 posts this week with engaging visuals and a clear call to action.',
      type: 'quick_win',
      source: 'report',
      cta_label: 'Plan your content',
      expires_at: expiresAt,
    })
  }

  return opps.slice(0, 2)
}

// ─── AI layer (optional, falls back to rules) ─────────────────────────────────

export async function generateWithAI(
  client: ClientProfile,
  pulseData: PulseData | null,
  reportSummary: string | null,
  rulesOutput: OpportunityInput[]
): Promise<OpportunityInput[]> {
  try {
    const expiresAt = pulseData
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const source: OpportunitySource = pulseData ? 'pulse' : 'report'

    const contextParts: string[] = [
      `Business: ${client.business_name}`,
      client.business_type ? `Type: ${client.business_type}` : '',
      client.primary_goal ? `Primary goal: ${client.primary_goal}` : '',
    ].filter(Boolean)

    if (pulseData) {
      contextParts.push(
        `This week's check-in: ${pulseData.leads_count ?? 0} new leads via ${pulseData.lead_source ?? 'unknown'}`,
        `Marketing activity: ${pulseData.marketing_activity ?? 'none'}`,
        `Blockers: ${pulseData.blockers ?? 'none'}`
      )
    }

    if (reportSummary) {
      contextParts.push(`Monthly report summary: ${reportSummary.slice(0, 500)}`)
    }

    const rulesContext = rulesOutput
      .map((o) => `- ${o.title}: ${o.description}`)
      .join('\n')

    const prompt = `You are a growth advisor for a digital marketing agency. Based on the client data below, generate 2–3 highly specific, actionable growth opportunities.

${contextParts.join('\n')}

Rule-based opportunities already identified:
${rulesContext}

Generate 2–3 additional or improved opportunities that are:
- More specific to this business than the rule-based ones
- Actionable within the next 7–30 days
- Written in plain English for a busy business owner
- NOT duplicates of the rule-based opportunities above

Respond ONLY with a JSON array. Each item must have exactly these fields:
{
  "title": "short title (max 8 words)",
  "description": "1–2 sentences, specific and actionable",
  "type": "growth" | "quick_win" | "feedback",
  "cta_label": "short call to action (max 5 words)"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = completion.choices[0]?.message?.content ?? '[]'
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return rulesOutput

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      title: string
      description: string
      type: OpportunityType
      cta_label: string
    }>

    const aiOpps: OpportunityInput[] = parsed
      .filter((o) => o.title && o.description && o.type && o.cta_label)
      .slice(0, 3)
      .map((o) => ({
        title: o.title,
        description: o.description,
        type: o.type,
        source,
        cta_label: o.cta_label,
        expires_at: expiresAt,
      }))

    // Merge: rules first, then AI additions, cap at 5 total
    return [...rulesOutput, ...aiOpps].slice(0, 5)
  } catch (err) {
    console.error('[opportunities-engine] AI generation failed, falling back to rules:', err)
    return rulesOutput
  }
}

// ─── Persist: replace auto-generated opps for a source ───────────────────────

export async function syncOpportunities(
  clientId: string,
  opps: OpportunityInput[],
  source: OpportunitySource,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any>
): Promise<void> {
  if (opps.length === 0) return

  // Delete existing auto-generated opportunities from this source
  await admin
    .from('opportunities')
    .delete()
    .eq('client_id', clientId)
    .eq('source', source)
    .in('status', ['open', 'active'])

  // Insert new ones
  const rows = opps.map((o) => ({
    client_id: clientId,
    title: o.title,
    description: o.description,
    type: o.type,
    source: o.source,
    status: 'open',
    cta_label: o.cta_label,
    expires_at: o.expires_at,
    metadata: o.metadata ?? null,
  }))

  await admin.from('opportunities').insert(rows)
}
