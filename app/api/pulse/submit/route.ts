import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { generatePulseInsights } from '@/lib/pulse-insights'

const schema = z.object({
  token: z.string().uuid(),
  leads_count: z.number().int().min(0),
  lead_source: z.enum(['Instagram', 'Google', 'Referral', 'Website', 'Other']),
  marketing_activity: z.string().min(1).max(500),
  blockers: z.string().min(1).max(500),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { token, leads_count, lead_source, marketing_activity, blockers } = parsed.data

  const admin = createAdminClient()

  const { data: pulse } = await admin
    .from('weekly_pulses')
    .select('id, status, token_expires_at')
    .eq('check_in_token', token)
    .single()

  if (!pulse) return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 404 })
  if (pulse.status === 'completed') return NextResponse.json({ error: 'Check-in already completed.' }, { status: 409 })

  if (pulse.token_expires_at && new Date(pulse.token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'This check-in link has expired.' }, { status: 410 })
  }

  const { summary, recommendation } = generatePulseInsights({
    leads_count,
    lead_source,
    marketing_activity,
    blockers,
  })

  await admin
    .from('weekly_pulses')
    .update({
      leads_count,
      lead_source,
      marketing_activity,
      blockers,
      summary,
      recommendation,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', pulse.id)

  return NextResponse.json({ ok: true })
}
