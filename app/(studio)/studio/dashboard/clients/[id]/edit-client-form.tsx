'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Client } from '@/types'

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

export default function EditClientForm({ client }: { client: Client }) {
  const router = useRouter()
  const [businessName, setBusinessName] = useState(client.business_name)
  const [businessType, setBusinessType] = useState(client.business_type ?? '')
  const [timezone, setTimezone] = useState(client.timezone)
  const [contactName, setContactName] = useState(client.contact_name ?? '')
  const [contactEmail, setContactEmail] = useState(client.contact_email ?? '')
  const [ga4PropertyId, setGa4PropertyId] = useState(client.ga4_property_id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setLoading(true)

    const res = await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: businessName,
        business_type: businessType || null,
        timezone,
        contact_name: contactName,
        contact_email: contactEmail,
        ga4_property_id: ga4PropertyId || null,
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Failed to save.')
      setLoading(false)
      return
    }

    setSaved(true)
    setLoading(false)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client profile</CardTitle>
        <CardDescription>Business details used to personalise reports.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className='space-y-6'>

          <fieldset className='space-y-4'>
            <legend className='text-sm font-semibold text-gray-700'>Business</legend>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='businessName'>Business name</Label>
                <Input
                  id='businessName'
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='businessType'>Business type</Label>
                <Input
                  id='businessType'
                  value={businessType}
                  placeholder='e.g. Restaurant, Retail…'
                  onChange={(e) => setBusinessType(e.target.value)}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='timezone'>Timezone</Label>
              <Select value={timezone} onValueChange={(v) => setTimezone(v ?? timezone)}>
                <SelectTrigger id='timezone'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </fieldset>

          <fieldset className='space-y-4'>
            <legend className='text-sm font-semibold text-gray-700'>Contact</legend>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='contactName'>Contact name</Label>
                <Input
                  id='contactName'
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='contactEmail'>Contact email</Label>
                <Input
                  id='contactEmail'
                  type='email'
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className='space-y-4'>
            <legend className='text-sm font-semibold text-gray-700'>Analytics</legend>
            <div className='space-y-2'>
              <Label htmlFor='ga4PropertyId'>GA4 Property ID</Label>
              <Input
                id='ga4PropertyId'
                value={ga4PropertyId}
                placeholder='e.g. 123456789'
                onChange={(e) => setGa4PropertyId(e.target.value)}
              />
              <p className='text-xs text-gray-400'>
                Found in GA4 → Admin → Property Settings → Property ID. Numbers only, no "properties/" prefix.
              </p>
            </div>
          </fieldset>

          {error && <p className='text-sm text-red-600'>{error}</p>}
          {saved && <p className='text-sm text-green-600'>Changes saved.</p>}

          <div className='flex justify-end'>
            <Button type='submit' disabled={loading}>
              {loading ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
