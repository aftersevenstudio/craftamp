import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { openai } from '@/lib/openai'

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

function buildSections(businessName: string, businessType: string, monthName: string): Section[] {
  const context = `Client: ${businessName} | Business type: ${businessType} | Report period: ${monthName}`

  return [
    {
      type: 'executive_summary',
      label: 'Executive Summary',
      prompt: `${context}

Write a professional executive summary for this client's monthly marketing report. Use markdown formatting.

Requirements:
- 3 short paragraphs
- Open with the single most important win or trend from the month
- Second paragraph: key metrics snapshot (use **bold** for numbers, create realistic benchmark figures appropriate for a ${businessType})
- Third paragraph: what to focus on heading into next month
- Tone: direct, confident, written for a busy business owner
- Do NOT use generic filler phrases like "In today's competitive landscape"

Return only the markdown content, no section title.`,
    },
    {
      type: 'website_performance',
      label: 'Website Performance',
      prompt: `${context}

Write the website performance section of this client's monthly marketing report. Use markdown formatting.

Requirements:
- Lead with a **headline metric** (e.g. total sessions) in bold
- Use a bullet list for core metrics: sessions, avg session duration, bounce rate, top 3 pages, mobile vs desktop split — use realistic figures for a ${businessType}
- 1-2 sentences of interpretation after the metrics
- Call out one positive trend and one area to improve
- Note: "Live GA4 integration coming soon — figures shown are indicative benchmarks for this business type"
- Keep it under 200 words

Return only the markdown content, no section title.`,
    },
    {
      type: 'local_presence',
      label: 'Local Presence',
      prompt: `${context}

Write the local presence / Google Business Profile section of this client's monthly marketing report. Use markdown formatting.

Requirements:
- Lead with total GBP views in **bold**
- Bullet list: profile views, search impressions, direction requests, website clicks from GBP, review count and average rating — use realistic figures for a ${businessType}
- 2-3 sentences interpreting the local search trend
- If review count is good, highlight it; if low, note it as an opportunity
- Note: "Live Google Business Profile integration coming soon — figures shown are indicative benchmarks"
- Keep it under 200 words

Return only the markdown content, no section title.`,
    },
    {
      type: 'recommendations',
      label: 'Recommendations',
      prompt: `${context}

Write the recommendations section of this client's monthly marketing report. Use markdown formatting.

Requirements:
- Exactly 4 numbered recommendations
- Each recommendation: **Bold title** followed by 1-2 sentences of specific action
- Make them concrete and actionable, not generic (e.g. not "post on social media" but "publish 3 Google posts this month highlighting your lunch specials to capture 'near me' searches")
- Order by impact: highest impact first
- Base them on what a ${businessType} business typically needs to grow local visibility and website performance
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
    .select('id, business_name, business_type')
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

  const sections = buildSections(
    client.business_name,
    client.business_type ?? 'local business',
    monthName
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
