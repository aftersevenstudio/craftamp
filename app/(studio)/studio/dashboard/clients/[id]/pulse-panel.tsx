'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { WeeklyPulse } from '@/types'

interface Props {
  clientId: string
  hasEmail: boolean
  latestPulse: WeeklyPulse | null
}

const SOURCE_LABELS: Record<string, string> = {
  Instagram: '📸 Instagram',
  Google: '🔍 Google',
  Referral: '🤝 Referral',
  Website: '🌐 Website',
  Other: '📌 Other',
}

export default function PulsePanel({ clientId, hasEmail, latestPulse }: Props) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/pulse/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to send.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle>Weekly Pulse</CardTitle>
            <CardDescription>Send a weekly email check-in to this client.</CardDescription>
          </div>
          {hasEmail ? (
            <Button
              size='sm'
              variant='outline'
              onClick={handleSend}
              disabled={loading || sent}
            >
              {loading ? 'Sending…' : sent ? 'Sent ✓' : 'Send this week\'s check-in'}
            </Button>
          ) : (
            <span className='text-xs text-gray-400'>Add a contact email to enable</span>
          )}
        </div>
        {error && <p className='text-sm text-red-600 mt-2'>{error}</p>}
      </CardHeader>

      {latestPulse && (
        <CardContent className='space-y-4'>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-gray-500'>
              Week of {new Date(latestPulse.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <Badge variant={latestPulse.status === 'completed' ? 'default' : 'secondary'}>
              {latestPulse.status === 'completed' ? 'Completed' : 'Awaiting response'}
            </Badge>
          </div>

          {latestPulse.status === 'completed' && (
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
              <div className='rounded-lg bg-gray-50 px-3 py-2'>
                <p className='text-xs text-gray-500'>Leads</p>
                <p className='text-xl font-bold text-gray-900'>{latestPulse.leads_count ?? '—'}</p>
              </div>
              <div className='rounded-lg bg-gray-50 px-3 py-2'>
                <p className='text-xs text-gray-500'>Source</p>
                <p className='text-sm font-medium text-gray-900'>{latestPulse.lead_source ? (SOURCE_LABELS[latestPulse.lead_source] ?? latestPulse.lead_source) : '—'}</p>
              </div>
              <div className='rounded-lg bg-gray-50 px-3 py-2 col-span-2'>
                <p className='text-xs text-gray-500'>Marketing</p>
                <p className='text-sm text-gray-700'>{latestPulse.marketing_activity ?? '—'}</p>
              </div>
            </div>
          )}

          {latestPulse.summary && (
            <div className='space-y-1'>
              <p className='text-sm text-gray-700'>{latestPulse.summary}</p>
              {latestPulse.recommendation && (
                <p className='text-sm text-indigo-700 font-medium'>→ {latestPulse.recommendation}</p>
              )}
            </div>
          )}

          {latestPulse.blockers && latestPulse.blockers.toLowerCase() !== 'no' && (
            <div className='rounded-lg border border-orange-100 bg-orange-50 px-3 py-2'>
              <p className='text-xs font-medium text-orange-700 mb-0.5'>Blocker noted</p>
              <p className='text-sm text-orange-800'>{latestPulse.blockers}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
