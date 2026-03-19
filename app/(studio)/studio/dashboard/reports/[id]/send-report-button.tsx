'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function SendReportButton({ reportId }: { reportId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/reports/${reportId}/send`, { method: 'POST' })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Failed to send report.')
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className='flex items-center gap-3'>
      {error && <p className='text-sm text-red-600'>{error}</p>}
      <Button onClick={handleSend} disabled={loading}>
        {loading ? 'Sending…' : 'Send to client'}
      </Button>
    </div>
  )
}
