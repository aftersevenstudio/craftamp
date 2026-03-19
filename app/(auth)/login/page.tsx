import { createAdminClient } from '@/lib/supabase/admin'
import LoginForm from './login-form'

interface Props {
  searchParams: Promise<{ studio?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { studio: slug } = await searchParams

  let studio = null
  if (slug) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('studios')
      .select('name, logo_url, brand_color')
      .eq('slug', slug)
      .single()
    studio = data ?? null
  }

  return <LoginForm studio={studio} />
}
