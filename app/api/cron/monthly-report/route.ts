import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: iterate clients, generate monthly reports, send via Resend
  return NextResponse.json({ message: 'Cron job not yet implemented' }, { status: 501 })
}
