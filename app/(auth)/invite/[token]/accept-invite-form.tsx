'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  token: string
  email: string
  contactName: string
  businessName: string
  studioName: string
  brandColor: string
  studioSlug: string
}

export default function AcceptInviteForm({
  token,
  email,
  contactName,
  businessName,
  studioName,
  brandColor,
  studioSlug,
}: Props) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    // Sign in with the newly created credentials
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push(`/${studioSlug}/overview`)
    router.refresh()
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <div className='w-full max-w-md'>
        {/* Studio branding strip */}
        <div
          className='h-1.5 rounded-t-xl'
          style={{ background: brandColor }}
        />

        <div className='bg-white rounded-b-xl shadow-sm border border-t-0 px-8 py-8'>
          <p
            className='text-xs font-semibold uppercase tracking-widest mb-4'
            style={{ color: brandColor }}
          >
            {studioName}
          </p>

          <h1 className='text-2xl font-bold text-gray-900 mb-1'>
            Welcome, {contactName}
          </h1>
          <p className='text-sm text-gray-500 mb-6'>
            Set a password to access the{' '}
            <span className='font-medium text-gray-700'>{businessName}</span> portal.
          </p>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input id='email' type='email' value={email} disabled />
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

            <Button
              type='submit'
              className='w-full'
              disabled={loading}
              style={{ background: brandColor }}
            >
              {loading ? 'Setting up your account…' : 'Create account'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
