export interface LocalInsights {
  events: string      // markdown block of upcoming local events
  partnerships: string // markdown block of partnership opportunities
  raw: string         // combined for prompt injection
}

async function webSearch(query: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input: query,
    }),
  })

  if (!res.ok) {
    console.error('[local-insights] web search failed:', await res.text())
    return ''
  }

  const data = await res.json()

  // Extract text from the response output array
  for (const item of data.output ?? []) {
    if (item.type === 'message') {
      for (const block of item.content ?? []) {
        if (block.type === 'output_text') return block.text ?? ''
      }
    }
  }

  return ''
}

export async function fetchLocalInsights(
  businessName: string,
  businessType: string,
  city: string,
  description: string | null,
  targetAudience: string | null
): Promise<LocalInsights | null> {
  if (!city) return null

  const today = new Date()
  const deadline = new Date(today)
  deadline.setDate(today.getDate() + 45)

  const dateRange = `${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} to ${deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

  // Build a rich business context string so search queries are specific
  const businessContext = [
    `${businessName} (${businessType})`,
    description ? `— ${description}` : null,
    targetAudience ? `Target audience: ${targetAudience}` : null,
  ].filter(Boolean).join(' ')

  let events = ''
  let partnerships = ''

  try {
    // Search for upcoming local events
    const eventsRaw = await webSearch(
      `Upcoming local events in ${city} from ${dateRange} relevant to: ${businessContext}. ` +
      `List 3 real events including name, date, and brief description. Focus on events this specific business could participate in, sponsor, exhibit at, or benefit from — be highly specific to their niche.`
    )
    events = eventsRaw

    // Search for partnership opportunities
    const partnershipsRaw = await webSearch(
      `Strategic local business partnership opportunities in ${city} for: ${businessContext}. ` +
      `Give 3 specific partnership ideas with the partner business type, how to collaborate, and the mutual benefit. Be concrete, local to ${city}, and tailored to this business's niche and audience.`
    )
    partnerships = partnershipsRaw
  } catch (err) {
    console.error('[local-insights] fetch error:', err)
    return null
  }

  if (!events && !partnerships) return null

  const raw = [
    events ? `UPCOMING LOCAL EVENTS IN ${city.toUpperCase()} (next 45 days):\n${events}` : '',
    partnerships ? `STRATEGIC PARTNERSHIP OPPORTUNITIES IN ${city}:\n${partnerships}` : '',
  ].filter(Boolean).join('\n\n')

  return { events, partnerships, raw }
}
