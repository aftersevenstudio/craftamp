'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'

const SOURCES = ['Instagram', 'Google', 'Referral', 'Website', 'Other'] as const
type Source = typeof SOURCES[number]

type Step = 1 | 2 | 3 | 4 | 'done' | 'error'

export default function CheckInPage() {
  const { token } = useParams<{ token: string }>()

  const [step, setStep] = useState<Step>(1)
  const [leadsCount, setLeadsCount] = useState('')
  const [leadSource, setLeadSource] = useState<Source | ''>('')
  const [marketingActivity, setMarketingActivity] = useState('')
  const [blockers, setBlockers] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit() {
    setSubmitting(true)
    setErrorMsg('')

    const res = await fetch('/api/pulse/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        leads_count: parseInt(leadsCount, 10),
        lead_source: leadSource,
        marketing_activity: marketingActivity,
        blockers,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setErrorMsg(json.error ?? 'Something went wrong.')
      setStep('error')
    } else {
      setStep('done')
    }
    setSubmitting(false)
  }

  const progress = step === 'done' || step === 'error' ? 100 : (Number(step) / 4) * 100

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12'>
      <div className='w-full max-w-md'>

        {/* Header */}
        {step !== 'done' && step !== 'error' && (
          <div className='mb-8 text-center'>
            <p className='text-xs font-medium text-gray-400 uppercase tracking-widest mb-1'>Weekly Check-In</p>
            <h1 className='text-2xl font-bold text-gray-900'>Quick update</h1>
            <p className='text-sm text-gray-500 mt-1'>4 questions · about 1 minute</p>
            {/* Progress bar */}
            <div className='mt-4 h-1 bg-gray-200 rounded-full overflow-hidden'>
              <div
                className='h-full bg-indigo-500 rounded-full transition-all duration-500'
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className='text-xs text-gray-400 mt-1'>Step {step} of 4</p>
          </div>
        )}

        {/* Step 1 — leads count */}
        {step === 1 && (
          <Card>
            <Question>How many new inquiries or customers did you get this week?</Question>
            <input
              type='number'
              min='0'
              value={leadsCount}
              onChange={(e) => setLeadsCount(e.target.value)}
              placeholder='0'
              className='w-full text-4xl font-bold text-center text-gray-900 border-0 border-b-2 border-gray-200 focus:border-indigo-500 focus:outline-none bg-transparent py-3 mb-6'
              autoFocus
            />
            <NextButton
              disabled={leadsCount === '' || isNaN(parseInt(leadsCount, 10))}
              onClick={() => setStep(2)}
            />
          </Card>
        )}

        {/* Step 2 — lead source */}
        {step === 2 && (
          <Card>
            <Question>Where did most of them come from?</Question>
            <div className='grid grid-cols-2 gap-2 mb-6 sm:grid-cols-3'>
              {SOURCES.map((s) => (
                <button
                  key={s}
                  onClick={() => setLeadSource(s)}
                  className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                    leadSource === s
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className='flex gap-2'>
              <BackButton onClick={() => setStep(1)} />
              <NextButton disabled={!leadSource} onClick={() => setStep(3)} />
            </div>
          </Card>
        )}

        {/* Step 3 — marketing activity */}
        {step === 3 && (
          <Card>
            <Question>Did you do any marketing this week?</Question>
            <p className='text-sm text-gray-400 mb-3'>e.g. posted on Instagram, ran a promo, sent emails — or just say No</p>
            <textarea
              value={marketingActivity}
              onChange={(e) => setMarketingActivity(e.target.value)}
              placeholder='Posted reels daily and ran a weekend promo...'
              rows={3}
              className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-6'
              autoFocus
            />
            <div className='flex gap-2'>
              <BackButton onClick={() => setStep(2)} />
              <NextButton disabled={!marketingActivity.trim()} onClick={() => setStep(4)} />
            </div>
          </Card>
        )}

        {/* Step 4 — blockers */}
        {step === 4 && (
          <Card>
            <Question>Anything slowing the business down right now?</Question>
            <p className='text-sm text-gray-400 mb-3'>Be honest — this stays between you and your studio. Or just say No.</p>
            <textarea
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder='No...'
              rows={3}
              className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-6'
              autoFocus
            />
            <div className='flex gap-2'>
              <BackButton onClick={() => setStep(3)} />
              <button
                onClick={handleSubmit}
                disabled={!blockers.trim() || submitting}
                className='flex-1 py-3 rounded-lg bg-indigo-600 text-white font-semibold text-sm disabled:opacity-50 hover:bg-indigo-700 transition-colors'
              >
                {submitting ? 'Saving…' : 'Submit check-in'}
              </button>
            </div>
          </Card>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className='text-center py-8'>
            <div className='text-5xl mb-4'>📊</div>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>Got it!</h2>
            <p className='text-gray-500 text-sm'>Your check-in is complete. Your dashboard has been updated.</p>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className='text-center py-8'>
            <div className='text-5xl mb-4'>⚠️</div>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>Something went wrong</h2>
            <p className='text-gray-500 text-sm'>{errorMsg}</p>
          </div>
        )}

      </div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
      {children}
    </div>
  )
}

function Question({ children }: { children: React.ReactNode }) {
  return <p className='text-lg font-semibold text-gray-900 mb-4 leading-snug'>{children}</p>
}

function NextButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className='flex-1 py-3 rounded-lg bg-indigo-600 text-white font-semibold text-sm disabled:opacity-40 hover:bg-indigo-700 transition-colors'
    >
      Next →
    </button>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className='px-4 py-3 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors'
    >
      Back
    </button>
  )
}
