'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
  { value: 'UTC', label: 'UTC' },
]

const BUSINESS_TYPES = [
  'Restaurant / Food & Beverage',
  'Retail',
  'Health & Wellness',
  'Professional Services',
  'Home Services',
  'Automotive',
  'Real Estate',
  'Education',
  'Non-profit',
  'Other',
]

export default function NewClientPage() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessName, businessType, timezone, contactName, contactEmail }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    if (json.inviteUrl) {
      // Email failed — show the invite link so it can be shared manually
      setInviteUrl(json.inviteUrl)
      setLoading(false)
      return
    }

    router.push('/studio/dashboard/clients')
    router.refresh()
  }

  return (
    <main className='max-w-2xl mx-auto px-4 py-10'>
        <Card>
          <CardHeader>
            <CardTitle>Invite a new client</CardTitle>
            <CardDescription>
              We'll create their portal and send them an invitation to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-6'>
              <fieldset className='space-y-4'>
                <legend className='text-sm font-semibold text-gray-700'>Business details</legend>

                <div className='space-y-2'>
                  <Label htmlFor='businessName'>Business name</Label>
                  <Input
                    id='businessName'
                    placeholder='Acme Coffee Co.'
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='businessType'>Business type</Label>
                  <Select value={businessType} onValueChange={(v) => setBusinessType(v ?? '')}>
                    <SelectTrigger id='businessType'>
                      <SelectValue placeholder='Select a type…' />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='timezone'>Timezone</Label>
                  <Select value={timezone} onValueChange={(v) => setTimezone(v ?? 'UTC')}>
                    <SelectTrigger id='timezone'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </fieldset>

              <fieldset className='space-y-4'>
                <legend className='text-sm font-semibold text-gray-700'>Contact to invite</legend>

                <div className='space-y-2'>
                  <Label htmlFor='contactName'>Contact name</Label>
                  <Input
                    id='contactName'
                    placeholder='Jane Smith'
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='contactEmail'>Contact email</Label>
                  <Input
                    id='contactEmail'
                    type='email'
                    placeholder='jane@acmecoffee.com'
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                  />
                </div>
              </fieldset>

              {error && <p className='text-sm text-red-600'>{error}</p>}

            {inviteUrl && (
              <div className='rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-2'>
                <p className='text-sm font-medium text-yellow-800'>
                  Client created, but the email failed to send. Share this link manually:
                </p>
                <div className='flex items-center gap-2'>
                  <input
                    readOnly
                    value={inviteUrl}
                    className='flex-1 rounded border bg-white px-3 py-1.5 text-xs font-mono text-gray-700 outline-none'
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    type='button'
                    className='text-xs text-yellow-800 underline underline-offset-2'
                    onClick={() => navigator.clipboard.writeText(inviteUrl)}
                  >
                    Copy
                  </button>
                </div>
                <p className='text-xs text-yellow-700'>
                  Check your <code>npm run dev</code> terminal for the Resend error details.
                </p>
              </div>
            )}

              <div className='flex items-center justify-end gap-3'>
                <Link href='/studio/dashboard/clients'>
                  <Button type='button' variant='outline'>
                    Cancel
                  </Button>
                </Link>
                <Button type='submit' disabled={loading}>
                  {loading ? 'Sending invite…' : 'Send invitation'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
  )
}
