'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { Opportunity } from '@/types'

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  growth:      { label: 'Growth',      color: 'bg-emerald-100 text-emerald-700', icon: '📈' },
  quick_win:   { label: 'Quick Win',   color: 'bg-amber-100 text-amber-700',     icon: '⚡' },
  feedback:    { label: 'Feedback',    color: 'bg-purple-100 text-purple-700',    icon: '💬' },
  local_event: { label: 'Local Event', color: 'bg-violet-100 text-violet-700',   icon: '📍' },
  partnership: { label: 'Partnership', color: 'bg-blue-100 text-blue-700',       icon: '🤝' },
  marketing:   { label: 'Marketing',   color: 'bg-orange-100 text-orange-700',   icon: '📣' },
  website:     { label: 'Website',     color: 'bg-cyan-100 text-cyan-700',       icon: '🌐' },
  review:      { label: 'Reviews',     color: 'bg-yellow-100 text-yellow-700',   icon: '⭐' },
  social:      { label: 'Social',      color: 'bg-pink-100 text-pink-700',       icon: '✨' },
  general:     { label: 'General',     color: 'bg-gray-100 text-gray-700',       icon: '💡' },
}

const STATUS_LABELS: Record<string, string> = {
  open:        'Open',
  in_progress: 'In Progress',
  completed:   'Completed',
  dismissed:   'Dismissed',
}

const STATUS_BADGE: Record<string, string> = {
  open:        'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed:   'bg-gray-100 text-gray-500',
}

interface Props {
  initialOpportunities: Opportunity[]
}

export default function OpportunitiesClient({ initialOpportunities }: Props) {
  const [opportunities, setOpportunities] = useState(initialOpportunities)
  const [loading, setLoading] = useState<string | null>(null)

  async function updateStatus(id: string, status: Opportunity['status']) {
    setLoading(id)

    // Optimistic update
    setOpportunities((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    )

    const res = await fetch(`/api/portal/opportunities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })

    if (!res.ok) {
      // Revert on failure
      setOpportunities(initialOpportunities)
    }

    setLoading(null)
  }

  const visible = opportunities.filter((o) => o.status !== 'dismissed')
  const open = visible.filter((o) => o.status === 'open')
  const inProgress = visible.filter((o) => o.status === 'in_progress')
  const completed = visible.filter((o) => o.status === 'completed')

  const sections = [
    { label: 'Open',        items: open },
    { label: 'In Progress', items: inProgress },
    { label: 'Completed',   items: completed },
  ].filter((s) => s.items.length > 0)

  if (visible.length === 0) {
    return (
      <Card>
        <CardContent className='py-16 text-center'>
          <p className='text-gray-400 text-sm'>No opportunities yet — check back after your first check-in or report.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='space-y-8'>
      {sections.map((section) => (
        <div key={section.label}>
          <h2 className='text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3'>
            {section.label} · {section.items.length}
          </h2>
          <div className='space-y-3'>
            {section.items.map((opp) => {
              const typeConfig = TYPE_CONFIG[opp.type] ?? TYPE_CONFIG.general
              const isCompleted = opp.status === 'completed'
              const isBusy = loading === opp.id

              return (
                <Card key={opp.id}>
                  <CardContent className='py-4 px-5'>
                    <div className='flex items-start justify-between gap-4'>
                      <div className='flex-1 min-w-0'>
                        {/* Type + source */}
                        <div className='flex items-center gap-2 mb-2 flex-wrap'>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeConfig.color}`}>
                            {typeConfig.icon} {typeConfig.label}
                          </span>
                          {opp.source && opp.source !== 'manual' && (
                            <span className='text-xs text-gray-400'>
                              From {opp.source === 'pulse' ? 'weekly check-in' : 'monthly report'}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <p className={`text-sm font-semibold ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {opp.title}
                        </p>

                        {/* Description */}
                        {opp.description && (
                          <p className='text-sm text-gray-500 mt-1 leading-relaxed'>{opp.description}</p>
                        )}

                        {/* CTA label */}
                        {opp.cta_label && !isCompleted && (
                          <p className='text-xs font-medium text-indigo-600 mt-2'>→ {opp.cta_label}</p>
                        )}

                        {/* Action buttons */}
                        <div className='flex items-center gap-2 mt-3 flex-wrap'>
                          {opp.status === 'open' && (
                            <>
                              <ActionButton
                                onClick={() => updateStatus(opp.id, 'in_progress')}
                                disabled={isBusy}
                                variant='primary'
                              >
                                Start working on it
                              </ActionButton>
                              <ActionButton
                                onClick={() => updateStatus(opp.id, 'completed')}
                                disabled={isBusy}
                                variant='ghost'
                              >
                                Mark complete
                              </ActionButton>
                              <ActionButton
                                onClick={() => updateStatus(opp.id, 'dismissed')}
                                disabled={isBusy}
                                variant='dismiss'
                              >
                                Dismiss
                              </ActionButton>
                            </>
                          )}

                          {opp.status === 'in_progress' && (
                            <>
                              <ActionButton
                                onClick={() => updateStatus(opp.id, 'completed')}
                                disabled={isBusy}
                                variant='primary'
                              >
                                Mark complete
                              </ActionButton>
                              <ActionButton
                                onClick={() => updateStatus(opp.id, 'open')}
                                disabled={isBusy}
                                variant='ghost'
                              >
                                Move back to open
                              </ActionButton>
                              <ActionButton
                                onClick={() => updateStatus(opp.id, 'dismissed')}
                                disabled={isBusy}
                                variant='dismiss'
                              >
                                Dismiss
                              </ActionButton>
                            </>
                          )}

                          {opp.status === 'completed' && (
                            <ActionButton
                              onClick={() => updateStatus(opp.id, 'open')}
                              disabled={isBusy}
                              variant='ghost'
                            >
                              Reopen
                            </ActionButton>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[opp.status] ?? STATUS_BADGE.open}`}>
                        {STATUS_LABELS[opp.status] ?? opp.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled: boolean
  variant: 'primary' | 'ghost' | 'dismiss'
}) {
  const styles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    ghost:   'border border-gray-200 text-gray-600 hover:bg-gray-50',
    dismiss: 'text-gray-400 hover:text-red-500',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${styles[variant]}`}
    >
      {children}
    </button>
  )
}
