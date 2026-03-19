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

const SECTION_ICONS: Record<string, string> = {
  executive_summary: '📋',
  website_performance: '📈',
  local_presence: '🌐',
  recommendations: '🎯',
}

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
    const totalSections = 4
    const progress = Math.round((liveSections.length / totalSections) * 100)

    return (
      <div className='min-h-screen bg-gray-50'>
        <header className='bg-white border-b'>
          <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <Link href='/studio/dashboard' className='text-sm text-gray-500 hover:text-gray-700'>Dashboard</Link>
              <span className='text-gray-300'>/</span>
              <Link href='/studio/dashboard/reports' className='text-sm text-gray-500 hover:text-gray-700'>Reports</Link>
              <span className='text-gray-300'>/</span>
              <span className='text-sm font-medium text-gray-900'>Generating</span>
            </div>
            {pageState === 'done' && reportId && (
              <div className='flex items-center gap-2'>
                <Link href={`/studio/dashboard/reports/${reportId}`}>
                  <Button variant='outline' size='sm'>View full report</Button>
                </Link>
                <Link href={`/studio/dashboard/reports/${reportId}`}>
                  <Button size='sm'>Send to client →</Button>
                </Link>
              </div>
            )}
          </div>
        </header>

        <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6'>
          {/* Progress */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <div>
                <h1 className='text-xl font-bold text-gray-900'>
                  {selectedClient?.business_name ?? 'Generating report…'}
                </h1>
                <p className='text-sm text-gray-500'>{periods.find(p => p.value === periodMonth)?.label}</p>
              </div>
              {pageState === 'generating' && (
                <span className='text-sm text-gray-500 animate-pulse'>Writing with AI…</span>
              )}
              {pageState === 'done' && (
                <span className='text-sm text-green-600 font-medium'>✓ Report ready</span>
              )}
            </div>
            <div className='w-full bg-gray-100 rounded-full h-1.5'>
              <div
                className='bg-gray-900 h-1.5 rounded-full transition-all duration-500'
                style={{ width: `${pageState === 'done' ? 100 : progress}%` }}
              />
            </div>
          </div>

          {/* Live sections */}
          {liveSections.map((section) => (
            <Card key={section.section_type} className='overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500'>
              <CardHeader className='bg-gray-50 border-b py-3 px-5'>
                <CardTitle className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                  <span>{SECTION_ICONS[section.section_type] ?? '📄'}</span>
                  {section.label}
                </CardTitle>
              </CardHeader>
              <CardContent className='px-5 py-4'>
                {section.error ? (
                  <p className='text-sm text-red-500'>Failed to generate this section.</p>
                ) : (
                  <div className='prose prose-sm prose-gray max-w-none'>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Skeleton for sections still generating */}
          {pageState === 'generating' && (
            <Card className='overflow-hidden opacity-50'>
              <CardHeader className='bg-gray-50 border-b py-3 px-5'>
                <div className='h-4 bg-gray-200 rounded w-32 animate-pulse' />
              </CardHeader>
              <CardContent className='px-5 py-4 space-y-2'>
                <div className='h-3 bg-gray-100 rounded animate-pulse' />
                <div className='h-3 bg-gray-100 rounded w-4/5 animate-pulse' />
                <div className='h-3 bg-gray-100 rounded w-3/5 animate-pulse' />
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <header className='bg-white border-b'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
          <div className='flex items-center gap-3'>
            <Link href='/studio/dashboard' className='text-sm text-gray-500 hover:text-gray-700'>Dashboard</Link>
            <span className='text-gray-300'>/</span>
            <Link href='/studio/dashboard/reports' className='text-sm text-gray-500 hover:text-gray-700'>Reports</Link>
            <span className='text-gray-300'>/</span>
            <span className='text-sm font-medium text-gray-900'>Generate</span>
          </div>
        </div>
      </header>

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
                  <SelectTrigger id='client'>
                    <SelectValue placeholder='Select a client…' />
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
                  <SelectTrigger id='period'>
                    <SelectValue />
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
    </div>
  )
}
