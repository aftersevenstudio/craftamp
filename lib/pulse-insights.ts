interface PulseData {
  leads_count: number
  lead_source: string
  marketing_activity: string
  blockers: string
}

const SOURCE_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  google: 'Google',
  referral: 'referrals',
  website: 'your website',
  other: 'other channels',
}

export function generatePulseInsights(data: PulseData): { summary: string; recommendation: string } {
  const { leads_count, lead_source, marketing_activity, blockers } = data
  const source = SOURCE_LABELS[lead_source.toLowerCase()] ?? lead_source
  const hasBlocker = blockers.toLowerCase() !== 'no' && blockers.trim().length > 0
  const didMarketing = marketing_activity.toLowerCase() !== 'no' && marketing_activity.trim().length > 0

  // Summary
  let summary = ''
  if (leads_count === 0) {
    summary = `No new inquiries this week — a quiet one.`
  } else if (leads_count >= 10) {
    summary = `Strong week — ${leads_count} new inquiries, mainly through ${source}.`
  } else if (leads_count >= 5) {
    summary = `Solid week with ${leads_count} new inquiries coming through ${source}.`
  } else {
    summary = `You had ${leads_count} new ${leads_count === 1 ? 'inquiry' : 'inquiries'} this week, mostly from ${source}.`
  }

  // Recommendation
  let recommendation = ''
  const sourceKey = lead_source.toLowerCase()

  if (hasBlocker) {
    recommendation = `Address the blocker first: "${blockers}". `
  }

  if (leads_count === 0) {
    recommendation += `Focus on outreach this week — send a follow-up to past contacts or post something engaging on your top channel.`
  } else if (sourceKey === 'instagram') {
    recommendation += didMarketing
      ? `Keep the Instagram momentum going — post consistently this week and add a clear call to action.`
      : `Instagram is working well for you. Consider posting 2–3 times this week with before/after content or a client spotlight.`
  } else if (sourceKey === 'google') {
    recommendation += `Google is driving results — make sure your GMB profile is up to date and ask recent clients for a review.`
  } else if (sourceKey === 'referral') {
    recommendation += `Referrals are your strongest channel. Reach out to your top 3 past clients this week and let them know you have availability.`
  } else if (sourceKey === 'website') {
    recommendation += `Your website is converting — check your top landing pages and make sure your contact form or booking link is prominent.`
  } else {
    recommendation += didMarketing
      ? `Good work on the marketing activity. Double down on what worked and track which channel drove the most response.`
      : `Try one focused marketing action this week — even a single post or message to past clients can drive new inquiries.`
  }

  return { summary, recommendation }
}

// Returns the ISO date of the most recent Monday
export function getWeekStart(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Sunday = 0, shift back to Monday
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

