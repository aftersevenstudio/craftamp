'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Opp {
  id: string
  title: string
  type: string
  description: string | null
  source: string | null
  cta_label: string | null
  status: string
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  local_event: { label: 'Local Event', color: 'bg-purple-100 text-purple-700' },
  partnership:  { label: 'Partnership', color: 'bg-blue-100 text-blue-700' },
  marketing:    { label: 'Marketing', color: 'bg-orange-100 text-orange-700' },
  website:      { label: 'Website', color: 'bg-cyan-100 text-cyan-700' },
  review:       { label: 'Reviews', color: 'bg-yellow-100 text-yellow-700' },
  social:       { label: 'Social', color: 'bg-pink-100 text-pink-700' },
  general:      { label: 'General', color: 'bg-gray-100 text-gray-700' },
}

export default function OverviewOpportunities({
  initialOpps,
  totalCount,
  slug,
  accent,
}: {
  initialOpps: Opp[]
  totalCount: number
  slug: string
  accent: string
}) {
  const [opps, setOpps] = useState(initialOpps)
  const [busy, setBusy] = useState<string | null>(null)

  async function updateStatus(id: string, status: string) {
    setBusy(id)
    setOpps((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
    await fetch(`/api/portal/opportunities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setBusy(null)
  }

  const visible = opps.filter((o) => o.status === 'open' || o.status === 'in_progress')

  if (visible.length === 0) return null

  return (
    <div>
      <div className='flex items-center justify-between mb-3'>
        <h2 className='text-sm font-semibold text-gray-900'>
          Growth opportunities <span className='text-gray-400 font-normal'>· {totalCount}</span>
        </h2>
        <Link href={`/${slug}/opportunities`} className='text-xs text-gray-400 hover:text-gray-600'>
          View all {totalCount} →
        </Link>
      </div>

      <div className='space-y-3'>
        {visible.map((opp) => {
          const typeConfig = TYPE_CONFIG[opp.type] ?? TYPE_CONFIG.general
          const isBusy = busy === opp.id

          return (
            <div key={opp.id} className='bg-white rounded-xl border border-gray-200 px-5 py-4'>
              <div className='flex items-start justify-between gap-3 mb-2'>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeConfig.color}`}>
                  {typeConfig.label}
                </span>
                {opp.status === 'in_progress' && (
                  <span className='text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700'>
                    In Progress
                  </span>
                )}
              </div>

              <p className='text-sm font-semibold text-gray-900'>{opp.title}</p>
              {opp.description && (
                <p className='text-sm text-gray-500 mt-1 leading-relaxed'>{opp.description}</p>
              )}
              {opp.cta_label && (
                <p className='text-xs font-medium mt-1.5' style={{ color: accent }}>→ {opp.cta_label}</p>
              )}

              <div className='flex items-center gap-2 mt-3'>
                {opp.status === 'open' && (
                  <>
                    <button
                      onClick={() => updateStatus(opp.id, 'in_progress')}
                      disabled={isBusy}
                      className='text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-40 transition-opacity'
                      style={{ backgroundColor: accent }}
                    >
                      Start working on it
                    </button>
                    <button
                      onClick={() => updateStatus(opp.id, 'completed')}
                      disabled={isBusy}
                      className='text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40'
                    >
                      Mark done
                    </button>
                    <button
                      onClick={() => updateStatus(opp.id, 'dismissed')}
                      disabled={isBusy}
                      className='text-xs text-gray-400 hover:text-red-400 px-2 disabled:opacity-40'
                    >
                      Dismiss
                    </button>
                  </>
                )}
                {opp.status === 'in_progress' && (
                  <>
                    <button
                      onClick={() => updateStatus(opp.id, 'completed')}
                      disabled={isBusy}
                      className='text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-40 transition-opacity'
                      style={{ backgroundColor: accent }}
                    >
                      Mark complete
                    </button>
                    <button
                      onClick={() => updateStatus(opp.id, 'open')}
                      disabled={isBusy}
                      className='text-xs text-gray-400 hover:text-gray-600 px-2 disabled:opacity-40'
                    >
                      Move back
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
