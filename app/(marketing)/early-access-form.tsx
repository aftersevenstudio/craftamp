'use client'

import { useState } from 'react'

export default function EarlyAccessForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (email.trim()) setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className='text-center py-5'>
        <p className='text-[#F8F8F7] text-base font-medium'>You're on the list.</p>
        <p className='text-[#A0A09E] text-sm mt-1'>We'll reach out when we open up spots.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className='flex flex-col sm:flex-row gap-3 justify-center mt-8'>
      <input
        type='email'
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder='you@youragency.com'
        className='w-full sm:w-72 px-4 py-3 rounded-lg bg-[#1F1F1E] border border-[#2E2E2C] text-[#F8F8F7] placeholder-[#A0A09E] text-sm focus:outline-none focus:ring-2 focus:ring-[#5046E4] focus:border-transparent'
      />
      <button
        type='submit'
        className='px-6 py-3 rounded-lg bg-[#5046E4] text-white text-sm font-semibold hover:bg-[#4038c7] transition-colors whitespace-nowrap'
      >
        Request early access
      </button>
    </form>
  )
}
