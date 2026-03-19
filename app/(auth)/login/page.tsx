'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Look up role to redirect to the right place
    const { data: userRecord } = await supabase
      .from('users')
      .select('role, studio_id, client_id')
      .eq('id', authData.user.id)
      .single()

    if (userRecord?.role === 'client_user' && userRecord.studio_id) {
      const { data: studio } = await supabase
        .from('studios')
        .select('slug')
        .eq('id', userRecord.studio_id)
        .single()

      router.push(studio?.slug ? `/${studio.slug}/overview` : '/login')
    } else {
      router.push('/studio/dashboard')
    }

    router.refresh()
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-1'>
          <CardTitle className='text-2xl font-bold'>Sign in to Craftamp</CardTitle>
          <CardDescription>Enter your email and password to access your portal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                placeholder='you@example.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='password'>Password</Label>
              <Input
                id='password'
                type='password'
                placeholder='••••••••'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className='text-sm text-red-600'>{error}</p>
            )}
            <Button type='submit' className='w-full' disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className='mt-4 text-center text-sm text-muted-foreground'>
            No account?{' '}
            <Link href='/signup' className='underline underline-offset-4 hover:text-primary'>
              Create your studio
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
