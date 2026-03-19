'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteReportButton({ reportId }: { reportId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/reports/${reportId}`, { method: 'DELETE' })
    router.refresh()
  }

  if (confirming) {
    return (
      <div className='flex items-center gap-2' onClick={(e) => e.preventDefault()}>
        <span className='text-xs text-gray-500'>Delete?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className='text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50'
        >
          {loading ? 'Deleting…' : 'Yes'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className='text-xs text-gray-400 hover:text-gray-600'
        >
          No
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); setConfirming(true) }}
      className='text-xs text-gray-400 hover:text-red-500 transition-colors'
    >
      Delete
    </button>
  )
}
