'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48)
}

export default function SignupPage() {
  const router = useRouter()
  const [studioName, setStudioName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleStudioNameChange(value: string) {
    setStudioName(value)
    if (!slugEdited) {
      setSlug(toSlug(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlug(toSlug(value))
    setSlugEdited(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studioName, slug, email, password }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    // Sign in immediately after account creation
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push('/studio/dashboard')
    router.refresh()
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-1'>
          <CardTitle className='text-2xl font-bold'>Create your studio</CardTitle>
          <CardDescription>Set up your agency account on Craftamp</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='studioName'>Studio name</Label>
              <Input
                id='studioName'
                placeholder='Acme Agency'
                value={studioName}
                onChange={(e) => handleStudioNameChange(e.target.value)}
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='slug'>Studio URL</Label>
              <div className='flex items-center rounded-md border focus-within:ring-2 focus-within:ring-ring overflow-hidden'>
                <span className='bg-muted px-3 py-2 text-sm text-muted-foreground border-r select-none'>
                  craftamp.com/
                </span>
                <input
                  id='slug'
                  className='flex-1 px-3 py-2 text-sm bg-background outline-none'
                  placeholder='acme-agency'
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='email'>Work email</Label>
              <Input
                id='email'
                type='email'
                placeholder='you@agency.com'
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
                placeholder='Min. 8 characters'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='confirm'>Confirm password</Label>
              <Input
                id='confirm'
                type='password'
                placeholder='••••••••'
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            {error && <p className='text-sm text-red-600'>{error}</p>}

            <Button type='submit' className='w-full' disabled={loading}>
              {loading ? 'Creating account…' : 'Create studio'}
            </Button>
          </form>

          <p className='mt-4 text-center text-sm text-muted-foreground'>
            Already have an account?{' '}
            <Link href='/login' className='underline underline-offset-4 hover:text-primary'>
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
