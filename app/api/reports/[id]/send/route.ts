import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import { reportReadyEmail } from '@/lib/email/report-ready'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { data: report } = await admin
    .from('reports')
    .select('id, client_id, status, period_month')
    .eq('id', id)
    .single()

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  if (report.status === 'sent') {
    return NextResponse.json({ error: 'Report has already been sent.' }, { status: 409 })
  }

  const [{ data: client }, { data: studio }] = await Promise.all([
    admin
      .from('clients')
      .select('studio_id, business_name, contact_name, contact_email')
      .eq('id', report.client_id)
      .single(),
    admin
      .from('studios')
      .select('slug, name, brand_color, logo_url')
      .eq('id', userRecord.studio_id)
      .single(),
  ])

  if (!client || client.studio_id !== userRecord.studio_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await admin
    .from('reports')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to send report.' }, { status: 500 })

  // Send notification email if we have a contact email
  if (client.contact_email && studio) {
    const [year, month] = report.period_month.split('-')
    const periodLabel = new Date(Number(year), Number(month) - 1).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const appHost = new URL(appUrl).hostname
    const isLocalhost = appHost === 'localhost' || appHost.endsWith('.vercel.app')
    const portalUrl = isLocalhost
      ? `${appUrl}/${studio.slug}/reports`
      : `https://${studio.slug}.craftamp.com/reports`

    await resend.emails.send({
      from: `${studio.name} <${process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'}>`,
      to: client.contact_email,
      subject: `Your ${periodLabel} report is ready`,
      html: reportReadyEmail({
        contactName: client.contact_name ?? 'there',
        studioName: studio.name,
        brandColor: studio.brand_color,
        logoUrl: studio.logo_url,
        businessName: client.business_name,
        periodLabel,
        portalUrl,
      }),
    })
  }

  return NextResponse.json({ ok: true })
}
