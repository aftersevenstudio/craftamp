'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Client {
  id: string
  business_name: string
}

export default function ReportsFilter({ clients }: { clients: Client[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('client') ?? ''

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (val) {
      params.set('client', val)
    } else {
      params.delete('client')
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      className='text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300'
    >
      <option value=''>All clients</option>
      {clients.map((c) => (
        <option key={c.id} value={c.id}>{c.business_name}</option>
      ))}
    </select>
  )
}
