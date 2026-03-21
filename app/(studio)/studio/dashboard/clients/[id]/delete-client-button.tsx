'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteClientButton({ clientId, businessName }: { clientId: string; businessName: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Failed to delete client.')
      setLoading(false)
      return
    }

    router.push('/studio/dashboard/clients')
    router.refresh()
  }

  return (
    <div className='rounded-xl border border-red-200 bg-red-50 p-5'>
      <h3 className='text-sm font-semibold text-red-700 mb-1'>Delete client</h3>
      <p className='text-sm text-red-600 mb-4'>
        Permanently deletes <strong>{businessName}</strong> and all associated reports, opportunities, pulse check-ins, and portal access. This cannot be undone.
      </p>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className='text-sm font-medium text-red-600 border border-red-300 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors'
        >
          Delete client
        </button>
      ) : (
        <div className='flex items-center gap-3'>
          <button
            onClick={handleDelete}
            disabled={loading}
            className='text-sm font-semibold text-white bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors'
          >
            {loading ? 'Deleting…' : 'Yes, delete permanently'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className='text-sm text-gray-500 hover:text-gray-700'
          >
            Cancel
          </button>
          {error && <p className='text-sm text-red-600'>{error}</p>}
        </div>
      )}
    </div>
  )
}
