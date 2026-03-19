'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface StudioBranding {
  name: string
  logo_url: string | null
  brand_color: string | null
}

interface Props {
  studio?: StudioBranding | null
}

export default function LoginForm({ studio }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const accentColor = studio?.brand_color ?? '#5046E4'

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

    const { data: userRecord } = await supabase
      .from('users')
      .select('role, studio_id, client_id')
      .eq('id', authData.user.id)
      .single()

    if (userRecord?.role === 'client_user' && userRecord.studio_id) {
      const host = window.location.hostname
      const onSubdomain =
        host.endsWith('.craftamp.com') &&
        host !== 'app.craftamp.com' &&
        !host.endsWith('.vercel.app')

      if (onSubdomain) {
        router.push('/overview')
      } else {
        const { data: studioData } = await supabase
          .from('studios')
          .select('slug')
          .eq('id', userRecord.studio_id)
          .single()
        router.push(studioData?.slug ? `/${studioData.slug}/overview` : '/login')
      }
    } else {
      router.push('/studio/dashboard')
    }

    router.refresh()
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 px-4'>
      <div className='w-full max-w-sm'>
        {/* Branding */}
        <div className='mb-8 text-center'>
          {studio?.logo_url ? (
            <Image
              src={studio.logo_url}
              alt={studio.name}
              width={160}
              height={48}
              className='h-10 w-auto mx-auto mb-3 object-contain'
            />
          ) : (
            <div
              className='text-xl font-bold tracking-tight mb-1'
              style={{ color: accentColor }}
            >
              {studio?.name ?? 'Craftamp'}
            </div>
          )}
          <p className='text-sm text-gray-500'>Sign in to your portal</p>
        </div>

        {/* Form */}
        <div className='bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4'>
          <form onSubmit={handleLogin} className='space-y-4'>
            <div className='space-y-1.5'>
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
            <div className='space-y-1.5'>
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
            {error && <p className='text-sm text-red-600'>{error}</p>}
            <button
              type='submit'
              disabled={loading}
              className='w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60'
              style={{ backgroundColor: accentColor }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {!studio && (
            <p className='text-center text-sm text-muted-foreground'>
              No account?{' '}
              <Link href='/signup' className='underline underline-offset-4 hover:text-primary'>
                Create your studio
              </Link>
            </p>
          )}
        </div>

        {studio && (
          <p className='mt-6 text-center text-xs text-gray-400'>
            Powered by Craftamp
          </p>
        )}
      </div>
    </div>
  )
}
