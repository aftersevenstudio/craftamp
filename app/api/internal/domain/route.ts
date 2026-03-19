import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Public internal route — only returns slug, no sensitive data
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const host = searchParams.get('host')?.toLowerCase().trim()

  if (!host) return NextResponse.json({ slug: null })

  const admin = createAdminClient()
  const { data: studio } = await admin
    .from('studios')
    .select('slug')
    .eq('custom_domain', host)
    .single()

  return NextResponse.json({ slug: studio?.slug ?? null })
}
