import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { pulseCheckinEmail } from '@/lib/email/pulse-checkin'
import { getWeekStart } from '@/lib/pulse-insights'

const resend = new Resend(process.env.RESEND_API_KEY)
const schema = z.object({ clientId: z.string().uuid() })

export async function POST(request: Request) {
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

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { clientId } = parsed.data

  const { data: client } = await admin
    .from('clients')
    .select('id, business_name, contact_name, contact_email, studio_id')
    .eq('id', clientId)
    .eq('studio_id', userRecord.studio_id)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  if (!client.contact_email) return NextResponse.json({ error: 'Client has no email address.' }, { status: 400 })

  const { data: studio } = await admin
    .from('studios')
    .select('name, brand_color, logo_url')
    .eq('id', userRecord.studio_id)
    .single()

  const weekStart = getWeekStart()

  // Don't send if already completed this week
  const { data: existing } = await admin
    .from('weekly_pulses')
    .select('id, status')
    .eq('client_id', clientId)
    .eq('week_start', weekStart)
    .single()

  if (existing?.status === 'completed') {
    return NextResponse.json({ error: 'Weekly check-in already completed for this week.' }, { status: 409 })
  }

  if (existing?.status === 'in_progress') {
    return NextResponse.json({ error: 'Check-in email already sent for this week.' }, { status: 409 })
  }

  // Generate token with 7-day expiry
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: pulse } = await admin
    .from('weekly_pulses')
    .insert({
      client_id: clientId,
      week_start: weekStart,
      status: 'in_progress',
      token_expires_at: tokenExpiresAt,
    })
    .select('check_in_token')
    .single()

  if (!pulse?.check_in_token) {
    return NextResponse.json({ error: 'Failed to create check-in.' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://craftamp.com'
  const checkInUrl = `${appUrl}/check-in/${pulse.check_in_token}`

  const weekDate = new Date(weekStart + 'T00:00:00')
  const weekLabel = weekDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'no-reply@craftamp.com',
    to: client.contact_email,
    subject: `Weekly check-in for ${client.business_name}`,
    html: pulseCheckinEmail({
      contactName: client.contact_name ?? 'there',
      studioName: studio?.name ?? 'Your studio',
      brandColor: studio?.brand_color ?? null,
      logoUrl: studio?.logo_url ?? null,
      businessName: client.business_name,
      checkInUrl,
      weekLabel,
    }),
  })

  return NextResponse.json({ ok: true, weekStart })
}
