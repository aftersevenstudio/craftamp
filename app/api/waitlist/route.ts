import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const schema = z.object({ email: z.string().email() })

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
  }

  const { email } = parsed.data
  const admin = createAdminClient()

  // Save to DB (ignore duplicate — already on list)
  const { error } = await admin.from('waitlist').insert({ email }).select().single()
  const alreadyExists = error?.code === '23505'
  if (error && !alreadyExists) {
    return NextResponse.json({ error: 'Failed to save.' }, { status: 500 })
  }

  // Notify — skip if duplicate so you don't get spammed
  if (!alreadyExists) {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'hello@craftamp.com',
      to: 'aftersevenstudio@gmail.com',
      subject: `New waitlist signup: ${email}`,
      html: `<p><strong>${email}</strong> just signed up for the Craftamp waitlist.</p>`,
    })
  }

  return NextResponse.json({ ok: true })
}
