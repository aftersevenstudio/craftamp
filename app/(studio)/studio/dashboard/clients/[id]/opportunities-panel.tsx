'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const OPPORTUNITY_TYPES = [
  { value: 'local_event', label: 'Local Event' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'website', label: 'Website' },
  { value: 'review', label: 'Reviews' },
  { value: 'social', label: 'Social Media' },
  { value: 'general', label: 'General' },
]

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'dismissed', label: 'Dismissed' },
]

const TYPE_COLORS: Record<string, string> = {
  local_event: 'bg-purple-100 text-purple-700',
  partnership: 'bg-blue-100 text-blue-700',
  marketing: 'bg-orange-100 text-orange-700',
  website: 'bg-cyan-100 text-cyan-700',
  review: 'bg-yellow-100 text-yellow-700',
  social: 'bg-pink-100 text-pink-700',
  general: 'bg-gray-100 text-gray-700',
}

interface Opportunity {
  id: string
  title: string
  type: string
  description: string | null
  status: string
  created_at: string
}

interface Props {
  clientId: string
  initialOpportunities: Opportunity[]
}

export default function OpportunitiesPanel({ clientId, initialOpportunities }: Props) {
  const router = useRouter()
  const [opportunities, setOpportunities] = useState(initialOpportunities)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('general')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/clients/${clientId}/opportunities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, type, description: description || undefined }),
    })

    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to create.')
      setLoading(false)
      return
    }

    setOpportunities((prev) => [json.opportunity, ...prev])
    setTitle('')
    setType('general')
    setDescription('')
    setShowForm(false)
    setLoading(false)
    router.refresh()
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/opportunities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setOpportunities((prev) => prev.map((o) => o.id === id ? { ...o, status } : o))
    router.refresh()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/opportunities/${id}`, { method: 'DELETE' })
    setOpportunities((prev) => prev.filter((o) => o.id !== id))
    router.refresh()
  }

  const typeLabel = (t: string) => OPPORTUNITY_TYPES.find((o) => o.value === t)?.label ?? t

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-base font-semibold text-gray-900'>Opportunities</h2>
        <Button size='sm' variant='outline' onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ Add opportunity'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className='rounded-xl border bg-gray-50 p-4 space-y-3'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div className='space-y-1'>
              <Label htmlFor='opp-title'>Title</Label>
              <Input
                id='opp-title'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g. Austin Car Show — April 12'
                required
              />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='opp-type'>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v ?? 'general')}>
                <SelectTrigger id='opp-type'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPPORTUNITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='space-y-1'>
            <Label htmlFor='opp-desc'>Description <span className='text-gray-400 font-normal'>(optional)</span></Label>
            <Textarea
              id='opp-desc'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='What is this opportunity and why does it matter?'
              rows={2}
            />
          </div>
          {error && <p className='text-sm text-red-600'>{error}</p>}
          <div className='flex justify-end'>
            <Button type='submit' size='sm' disabled={loading}>
              {loading ? 'Adding…' : 'Add opportunity'}
            </Button>
          </div>
        </form>
      )}

      {!opportunities.length ? (
        <div className='rounded-xl border border-dashed py-10 text-center'>
          <p className='text-sm text-gray-400'>No opportunities yet. Add one above.</p>
        </div>
      ) : (
        <div className='divide-y rounded-xl border bg-white overflow-hidden'>
          {opportunities.map((opp) => (
            <div key={opp.id} className='flex items-start justify-between gap-4 px-4 py-3'>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2 mb-0.5'>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[opp.type] ?? TYPE_COLORS.general}`}>
                    {typeLabel(opp.type)}
                  </span>
                </div>
                <p className='text-sm font-medium text-gray-900 truncate'>{opp.title}</p>
                {opp.description && (
                  <p className='text-xs text-gray-500 mt-0.5 line-clamp-2'>{opp.description}</p>
                )}
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                <Select value={opp.status} onValueChange={(v) => handleStatusChange(opp.id, v)}>
                  <SelectTrigger className='h-7 text-xs w-32'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => handleDelete(opp.id)}
                  className='text-xs text-gray-300 hover:text-red-500 transition-colors'
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
