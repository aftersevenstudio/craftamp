'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

const PRIMARY_GOALS = [
  { value: 'increase_foot_traffic', label: 'Increase Foot Traffic' },
  { value: 'grow_online_sales', label: 'Grow Online Sales' },
  { value: 'generate_leads', label: 'Generate Leads' },
  { value: 'build_brand_awareness', label: 'Build Brand Awareness' },
  { value: 'grow_event_bookings', label: 'Grow Event Bookings' },
  { value: 'retain_existing_customers', label: 'Retain Existing Customers' },
]

export default function EditClientForm({ client }: { client: Client }) {
  const router = useRouter()
  const [businessName, setBusinessName] = useState(client.business_name)
  const [businessType, setBusinessType] = useState(client.business_type ?? '')
  const [city, setCity] = useState(client.city ?? '')
  const [description, setDescription] = useState(client.description ?? '')
  const [primaryGoal, setPrimaryGoal] = useState(client.primary_goal ?? '')
  const [targetAudience, setTargetAudience] = useState(client.target_audience ?? '')
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
        city: city || null,
        description: description || null,
        primary_goal: primaryGoal || null,
        target_audience: targetAudience || null,
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
              <Label htmlFor='city'>City</Label>
              <Input
                id='city'
                value={city}
                placeholder='e.g. Austin, TX'
                onChange={(e) => setCity(e.target.value)}
              />
              <p className='text-xs text-gray-400'>Used to find local events and partnership opportunities in reports.</p>
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
            <legend className='text-sm font-semibold text-gray-700'>Report targeting</legend>
            <p className='text-xs text-gray-400 -mt-2'>The more detail here, the sharper the AI-generated reports.</p>

            <div className='space-y-2'>
              <Label htmlFor='description'>Business description</Label>
              <Textarea
                id='description'
                value={description}
                placeholder='e.g. Family-owned Italian restaurant in the arts district, known for wood-fired pizza and date-night atmosphere.'
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='primaryGoal'>Primary goal</Label>
                <Select value={primaryGoal} onValueChange={(v) => setPrimaryGoal(v ?? '')}>
                  <SelectTrigger id='primaryGoal'>
                    <SelectValue placeholder='Select a goal…' />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIMARY_GOALS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='targetAudience'>Target audience</Label>
                <Input
                  id='targetAudience'
                  value={targetAudience}
                  placeholder='e.g. Couples and professionals aged 28–45'
                  onChange={(e) => setTargetAudience(e.target.value)}
                />
              </div>
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
