'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function SignOutButton({ redirectTo = '/login' }: { redirectTo?: string }) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <Button variant='ghost' size='sm' onClick={handleSignOut}>
      Sign out
    </Button>
  )
}
