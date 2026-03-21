'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Client {
  id: string
  business_name: string
}

interface LiveSection {
  section_type: string
  label: string
  content: string
  error?: boolean
}

type PageState = 'idle' | 'generating' | 'done'

const SECTIONS = [
  { type: 'executive_summary',  label: 'Executive Summary',    icon: '📋' },
  { type: 'website_performance', label: 'Website Performance', icon: '📈' },
  { type: 'local_presence',     label: 'Local Presence',       icon: '🌐' },
  { type: 'recommendations',    label: 'Recommendations',      icon: '🎯' },
]

function getPeriodOptions() {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

export default function NewReportPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [periodMonth, setPeriodMonth] = useState(getPeriodOptions()[1].value)
  const [error, setError] = useState<string | null>(null)
  const [pageState, setPageState] = useState<PageState>('idle')
  const [liveSections, setLiveSections] = useState<LiveSection[]>([])
  const [reportId, setReportId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((data) => setClients(data.clients ?? []))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) { setError('Please select a client.'); return }
    setError(null)
    setLiveSections([])
    setPageState('generating')

    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, periodMonth }),
    })

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Something went wrong.')
      setPageState('idle')
      return
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))

          if (data.type === 'section') {
            setLiveSections((prev) => [
              ...prev,
              { section_type: data.section_type, label: data.label, content: data.content },
            ])
          } else if (data.type === 'section_error') {
            setLiveSections((prev) => [
              ...prev,
              { section_type: data.section_type, label: data.label, content: '', error: true },
            ])
          } else if (data.type === 'done') {
            setReportId(data.reportId)
            setPageState('done')
          }
        } catch {}
      }
    }
  }

  const periods = getPeriodOptions()
  const selectedClient = clients.find((c) => c.id === clientId)

  if (pageState === 'generating' || pageState === 'done') {
    const completedTypes = new Set(liveSections.map((s) => s.section_type))
    const currentSectionIndex = liveSections.length
    const progress = pageState === 'done' ? 100 : Math.round((liveSections.length / SECTIONS.length) * 100)

    return (
      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6'>

        {/* Header */}
        <div className='flex items-start justify-between gap-4'>
          <div>
            <h1 className='text-xl font-bold text-gray-900'>
              {selectedClient?.business_name}
            </h1>
            <p className='text-sm text-gray-500 mt-0.5'>{periods.find(p => p.value === periodMonth)?.label} report</p>
          </div>
          {pageState === 'done' && reportId && (
            <div className='flex items-center gap-2 shrink-0'>
              <Link href={`/studio/dashboard/reports/${reportId}`}>
                <Button variant='outline' size='sm'>View report</Button>
              </Link>
              <Link href={`/studio/dashboard/reports/${reportId}`}>
                <Button size='sm'>Send to client →</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Progress bar + section steps */}
        <div className='bg-white rounded-xl border border-gray-200 p-5 space-y-4'>
          <div className='flex items-center justify-between mb-1'>
            <span className='text-xs font-medium text-gray-500'>
              {pageState === 'done' ? 'Complete' : `Writing section ${currentSectionIndex + 1} of ${SECTIONS.length}…`}
            </span>
            <span className='text-xs font-medium text-gray-500'>{progress}%</span>
          </div>
          <div className='w-full bg-gray-100 rounded-full h-1.5'>
            <div
              className='bg-gray-900 h-1.5 rounded-full transition-all duration-700'
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Section checklist */}
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1'>
            {SECTIONS.map((s, i) => {
              const done = completedTypes.has(s.type)
              const active = !done && i === currentSectionIndex && pageState === 'generating'
              return (
                <div
                  key={s.type}
                  className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border transition-colors ${
                    done  ? 'bg-green-50 border-green-200 text-green-700' :
                    active ? 'bg-gray-50 border-gray-300 text-gray-700' :
                             'border-gray-100 text-gray-400'
                  }`}
                >
                  <span>
                    {done ? '✓' : active ? <span className='inline-block animate-pulse'>⋯</span> : s.icon}
                  </span>
                  <span className='font-medium truncate'>{s.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sections — show all, skeleton until content arrives */}
        <div className='space-y-4'>
          {SECTIONS.map((s) => {
            const live = liveSections.find((l) => l.section_type === s.type)
            const isNext = !live && liveSections.length === SECTIONS.indexOf(s) && pageState === 'generating'
            const isPending = !live && !isNext

            if (isPending) {
              return (
                <Card key={s.type} className='overflow-hidden opacity-40'>
                  <CardHeader className='bg-gray-50 border-b py-3 px-5'>
                    <CardTitle className='text-sm font-semibold text-gray-400 flex items-center gap-2'>
                      <span>{s.icon}</span>{s.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='px-5 py-4 space-y-2'>
                    <div className='h-3 bg-gray-100 rounded w-full' />
                    <div className='h-3 bg-gray-100 rounded w-4/5' />
                    <div className='h-3 bg-gray-100 rounded w-3/5' />
                  </CardContent>
                </Card>
              )
            }

            if (isNext) {
              return (
                <Card key={s.type} className='overflow-hidden'>
                  <CardHeader className='bg-gray-50 border-b py-3 px-5'>
                    <CardTitle className='text-sm font-semibold text-gray-600 flex items-center gap-2'>
                      <span>{s.icon}</span>{s.label}
                      <span className='ml-1 text-gray-400 animate-pulse'>writing…</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='px-5 py-4 space-y-2'>
                    <div className='h-3 bg-gray-100 rounded w-full animate-pulse' />
                    <div className='h-3 bg-gray-100 rounded w-4/5 animate-pulse' />
                    <div className='h-3 bg-gray-100 rounded w-3/5 animate-pulse' />
                  </CardContent>
                </Card>
              )
            }

            return (
              <Card key={s.type} className='overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500'>
                <CardHeader className='bg-gray-50 border-b py-3 px-5'>
                  <CardTitle className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                    <span className='text-green-500'>✓</span>
                    {s.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className='px-5 py-4'>
                  {live!.error ? (
                    <p className='text-sm text-red-500'>Failed to generate this section.</p>
                  ) : (
                    <div className='prose prose-sm prose-gray max-w-none'>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{live!.content}</ReactMarkdown>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Done CTA — repeated at bottom for long pages */}
        {pageState === 'done' && reportId && (
          <div className='flex items-center justify-end gap-2 pt-2'>
            <Link href={`/studio/dashboard/reports/${reportId}`}>
              <Button variant='outline' size='sm'>View report</Button>
            </Link>
            <Link href={`/studio/dashboard/reports/${reportId}`}>
              <Button size='sm'>Send to client →</Button>
            </Link>
          </div>
        )}

      </main>
    )
  }

  return (
    <main className='max-w-2xl mx-auto px-4 py-10'>
        <Card>
          <CardHeader>
            <CardTitle>Generate a report</CardTitle>
            <p className='text-sm text-gray-500 mt-1'>
              GPT-4o will write a professional monthly report for your client. Each section appears as it&apos;s written.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-5'>
              <div className='space-y-2'>
                <Label htmlFor='client'>Client</Label>
                <Select value={clientId} onValueChange={(v) => setClientId(v ?? '')}>
                  <SelectTrigger id='client' className='w-full'>
                    <SelectValue placeholder='Select a client…'>
                      {clients.find((c) => c.id === clientId)?.business_name ?? 'Select a client…'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='period'>Report period</Label>
                <Select value={periodMonth} onValueChange={(v) => setPeriodMonth(v ?? periodMonth)}>
                  <SelectTrigger id='period' className='w-full'>
                    <SelectValue>
                      {periods.find((p) => p.value === periodMonth)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && <p className='text-sm text-red-600'>{error}</p>}

              <div className='flex items-center justify-end gap-3'>
                <Link href='/studio/dashboard/reports'>
                  <Button type='button' variant='outline'>Cancel</Button>
                </Link>
                <Button type='submit'>Generate report</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
  )
}
