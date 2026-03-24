import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { openai } from '@/lib/openai'
import { fetchGA4Metrics, formatGA4ForPrompt, type GA4Metrics } from '@/lib/ga4'
import { fetchLocalInsights, type LocalInsights } from '@/lib/local-insights'
import { rulesFromReport, generateWithAI, syncOpportunities } from '@/lib/opportunities-engine'

const schema = z.object({
  clientId: z.string().uuid(),
  periodMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Period must be in YYYY-MM format'),
})

interface Section {
  type: string
  label: string
  prompt: string
}

const GOAL_LABELS: Record<string, string> = {
  increase_foot_traffic: 'Increase Foot Traffic',
  grow_online_sales: 'Grow Online Sales',
  generate_leads: 'Generate Leads',
  build_brand_awareness: 'Build Brand Awareness',
  grow_event_bookings: 'Grow Event Bookings',
  retain_existing_customers: 'Retain Existing Customers',
}

function buildSections(
  businessName: string,
  businessType: string,
  city: string | null,
  description: string | null,
  primaryGoal: string | null,
  targetAudience: string | null,
  monthName: string,
  ga4: GA4Metrics | null,
  localInsights: LocalInsights | null,
  hasGA4Property: boolean
): Section[] {
  const goalLabel = primaryGoal ? GOAL_LABELS[primaryGoal] ?? primaryGoal : null
  const context = [
    `Client: ${businessName}`,
    `Business type: ${businessType}`,
    description ? `Description: ${description}` : null,
    goalLabel ? `Primary goal: ${goalLabel}` : null,
    targetAudience ? `Target audience: ${targetAudience}` : null,
    city ? `City: ${city}` : null,
    `Report period: ${monthName}`,
  ].filter(Boolean).join(' | ')

  const ga4Block = ga4 && ga4.sufficientData ? formatGA4ForPrompt(ga4) : null

  // --- Website Performance prompt: 3 distinct cases ---
  let websitePrompt: string

  if (ga4Block) {
    // Case 1: GA4 connected with sufficient data — use real figures
    websitePrompt = `${context}

${ga4Block}

Write the website performance section of this client's monthly marketing report. Use markdown formatting.

Requirements:
- Use the REAL GA4 figures above — do not invent or round numbers beyond what's shown
- Lead with a **headline metric** (total sessions) in bold
- Use a bullet list for core metrics: sessions, users, bounce rate, avg session duration, top pages, mobile vs desktop split
- 1-2 sentences interpreting what the numbers mean for this business
- Call out one positive trend and one area to improve
- Keep it under 200 words

Return only the markdown content, no section title.`

  } else if (hasGA4Property && ga4 && !ga4.sufficientData) {
    // Case 2: GA4 connected but not enough data yet (< 14 days)
    const partialBlock = formatGA4ForPrompt(ga4)
    websitePrompt = `${context}

${partialBlock}
Days with recorded sessions: ${ga4.daysWithData} out of the full month

Write the website performance section of this client's monthly marketing report. Use markdown formatting.

This client's GA4 tracking was recently set up and only ${ga4.daysWithData} day(s) of data are available for ${monthName}. The figures above are real but partial.

Requirements:
- Open with a brief, professional note that GA4 tracking was recently installed and this section reflects ${ga4.daysWithData} day(s) of data for ${monthName}
- Show the available real metrics in a bullet list (clearly labeled as partial-month data)
- 1-2 sentences on what trends are emerging from the limited data
- Close with a forward-looking sentence: what the client can expect to see once a full month of data is available
- Do NOT fabricate or extrapolate full-month numbers
- Keep it under 180 words

Return only the markdown content, no section title.`

  } else {
    // Case 3: No GA4 property configured at all
    websitePrompt = `${context}

Write the website performance section of this client's monthly marketing report. Use markdown formatting.

GA4 is not yet connected for this client.

Requirements:
- Open with a professional 1-2 sentence explanation that website analytics data is not yet available for ${monthName} because GA4 tracking has not been connected for this account
- Include a brief bullet list of the key metrics that WILL be tracked once GA4 is connected: sessions, users, bounce rate, avg session duration, top pages, device breakdown
- 1-2 sentences on why having this data matters for a ${businessType} business (be specific to their business type and goal, if known)
- End with a clear, encouraging next step: connect GA4 in the client settings to unlock real analytics in the next report
- Tone: professional and helpful, not apologetic — frame it as "here's what's coming"
- Do NOT invent or estimate any traffic figures
- Keep it under 180 words

Return only the markdown content, no section title.`
  }

  // --- Executive Summary prompt ---
  let executiveSummaryPrompt: string

  if (ga4Block) {
    executiveSummaryPrompt = `${context}

${ga4Block}

Write a professional executive summary for this client's monthly marketing report. Use markdown formatting.

Requirements:
- 3 short paragraphs
- Open with the single most important insight from the REAL GA4 data above
- Second paragraph: highlight 2-3 key metrics from the data using **bold** for numbers
- Third paragraph: what to focus on heading into next month, grounded in the data
- Tone: direct, confident, written for a busy business owner
- Do NOT use generic filler phrases like "In today's competitive landscape"

Return only the markdown content, no section title.`

  } else if (hasGA4Property && ga4 && !ga4.sufficientData) {
    const partialBlock = formatGA4ForPrompt(ga4)
    executiveSummaryPrompt = `${context}

${partialBlock}
Days with recorded sessions: ${ga4.daysWithData}

Write a professional executive summary for this client's monthly marketing report. Use markdown formatting.

GA4 was recently installed and only partial data is available for ${monthName}.

Requirements:
- 3 short paragraphs
- Open by acknowledging that ${monthName} marks the start of real analytics tracking for this business — frame it as a milestone
- Second paragraph: reference the partial GA4 data available (${ga4.daysWithData} day(s)), mention what it shows even if limited, use **bold** for any real figures
- Third paragraph: what to focus on heading into next month now that tracking is in place
- Tone: forward-looking and confident
- Do NOT fabricate full-month figures

Return only the markdown content, no section title.`

  } else {
    executiveSummaryPrompt = `${context}

Write a professional executive summary for this client's monthly marketing report. Use markdown formatting.

GA4 is not yet connected for this client, so website analytics data is unavailable.

Requirements:
- 3 short paragraphs
- Open with the single most important win or focus area for this business in ${monthName} (local presence, goal progress, or market opportunity — based on business type and goal)
- Second paragraph: highlight 2-3 strategic priorities relevant to a ${businessType} business without fabricating traffic numbers — frame around what they should be measuring and why
- Third paragraph: what to focus on heading into next month, including connecting GA4 as a concrete action item
- Tone: direct, confident, written for a busy business owner
- Do NOT invent traffic or analytics figures

Return only the markdown content, no section title.`
  }

  return [
    {
      type: 'executive_summary',
      label: 'Executive Summary',
      prompt: executiveSummaryPrompt,
    },
    {
      type: 'website_performance',
      label: 'Website Performance',
      prompt: websitePrompt,
    },
    {
      type: 'local_presence',
      label: 'Local Opportunity',
      prompt: localInsights
        ? `${context}

${localInsights.raw}

Using the real local data above, write the Local Opportunity section of this client's monthly marketing report. Use markdown formatting.

Structure the section as follows:

**Local Events (Next 45 Days)**
- List 2-3 of the upcoming events from the data above that ${businessName} could realistically participate in or benefit from
- For each: event name, date, and 1 sentence on how the business could leverage it (e.g. run a promo, attend, sponsor, set up a booth)

**Strategic Partnerships**
- List 2-3 partnership opportunities from the data above
- For each: the partner type, the collaboration idea, and the mutual benefit in 1-2 sentences

**Local Market Pulse**
- 2-3 sentences on the local opportunity landscape for a ${businessType} in ${city ?? 'this area'}
- Be specific to the market, not generic

Keep each section tight. Tone: practical, forward-looking, written for an agency presenting to a client.

Return only the markdown content, no section title.`
        : `${context}

Write the local presence section of this client's monthly marketing report. Use markdown formatting.

Structure the section as follows:

**Local Events (Next 45 Days)**
- 2-3 types of community events typical for a ${businessType} in ${city ?? 'their area'} that they should be aware of or participate in
- Note these are suggested event types, not confirmed events

**Strategic Partnerships**
- 2-3 concrete partnership ideas with complementary local business types
- For each: the partner type, the collaboration idea, and the mutual benefit

**Local Market Pulse**
- 2-3 sentences on what a ${businessType} should be focused on in their local market right now
- Note: "Add your city to unlock real local event and partnership data in future reports"

Keep it under 250 words. Tone: practical, forward-looking.

Return only the markdown content, no section title.`,
    },
    {
      type: 'recommendations',
      label: 'Recommendations',
      prompt: `${context}${ga4Block ? `\n\n${ga4Block}` : ''}${localInsights ? `\n\n${localInsights.raw}` : ''}

Write the recommendations section of this client's monthly marketing report. Use markdown formatting.

Requirements:
- Exactly 4 numbered recommendations
- Each recommendation: **Bold title** followed by 1-2 sentences of specific action
- Make them concrete and actionable, not generic${ga4Block ? ' — ground them in the real GA4 data where relevant' : ''}${!hasGA4Property ? '\n- Include connecting GA4 analytics as one of the recommendations' : ''}${localInsights ? ' — reference specific upcoming events or partnership opportunities where relevant' : ''}
- Order by impact: highest impact first
- Base them on what a ${businessType} business needs to grow local visibility and website performance
- End with a brief encouraging closing line (not a list item)

Return only the markdown content, no section title.`,
    },
  ]
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { clientId, periodMonth } = parsed.data
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
    .select('id, business_name, business_type, city, description, primary_goal, target_audience, ga4_property_id')
    .eq('id', clientId)
    .eq('studio_id', userRecord.studio_id)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const { data: existing } = await admin
    .from('reports')
    .select('id')
    .eq('client_id', clientId)
    .eq('period_month', periodMonth)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: `A report for ${periodMonth} already exists for this client.` },
      { status: 409 }
    )
  }

  const { data: report, error: reportError } = await admin
    .from('reports')
    .insert({ client_id: clientId, period_month: periodMonth, status: 'draft' })
    .select('id')
    .single()

  if (reportError || !report) {
    return NextResponse.json({ error: 'Failed to create report.' }, { status: 500 })
  }

  const [year, month] = periodMonth.split('-')
  const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  // Fetch real GA4 data if the client has a property ID configured
  let ga4Metrics = null
  if (client.ga4_property_id) {
    ga4Metrics = await fetchGA4Metrics(userRecord.studio_id, client.ga4_property_id, periodMonth)
    if (ga4Metrics) {
      console.log(`[generate] GA4 data fetched for property ${client.ga4_property_id}`)
    } else {
      console.warn(`[generate] GA4 fetch failed for property ${client.ga4_property_id}, falling back to AI estimates`)
    }
  }

  // Fetch local insights if city is set
  let localInsights = null
  if (client.city) {
    localInsights = await fetchLocalInsights(
      client.business_name,
      client.business_type ?? 'local business',
      client.city,
      client.description ?? null,
      client.target_audience ?? null
    )
    if (localInsights) {
      console.log(`[generate] Local insights fetched for ${client.city}`)
    } else {
      console.warn(`[generate] Local insights fetch failed for ${client.city}`)
    }
  }

  const hasGA4Property = !!client.ga4_property_id

  const sections = buildSections(
    client.business_name,
    client.business_type ?? 'local business',
    client.city ?? null,
    client.description ?? null,
    client.primary_goal ?? null,
    client.target_audience ?? null,
    monthName,
    ga4Metrics,
    localInsights,
    hasGA4Property
  )

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i]
        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 600,
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert digital marketing analyst writing professional monthly client reports. Write clearly, concisely, and with authority. Use markdown formatting.',
              },
              { role: 'user', content: section.prompt },
            ],
          })

          const content = completion.choices[0]?.message?.content ?? ''

          await admin.from('report_sections').insert({
            report_id: report.id,
            section_type: section.type,
            ai_content: content,
            display_order: i,
          })

          send({ type: 'section', section_type: section.type, label: section.label, content })
        } catch (err) {
          console.error(`[generate] section ${section.type} error:`, err)
          send({ type: 'section_error', section_type: section.type, label: section.label })
        }
      }

      send({ type: 'done', reportId: report.id })

      // Generate report-based opportunities after all sections complete
      try {
        const savedSections = await admin
          .from('report_sections')
          .select('section_type, ai_content')
          .eq('report_id', report.id)

        const rules = rulesFromReport(savedSections.data ?? [], ga4Metrics)
        const reportSummary = savedSections.data?.find((s) => s.section_type === 'executive_summary')?.ai_content ?? null
        const opps = await generateWithAI(
          { business_name: client.business_name, business_type: client.business_type ?? null, primary_goal: client.primary_goal ?? null },
          null,
          reportSummary,
          rules
        )
        await syncOpportunities(clientId, opps, 'report', admin)
      } catch (err) {
        console.error('[generate] opportunity generation failed:', err)
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
