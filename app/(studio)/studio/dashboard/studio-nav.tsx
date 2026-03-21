'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/studio/dashboard', label: 'Dashboard' },
  { href: '/studio/dashboard/clients', label: 'Clients' },
  { href: '/studio/dashboard/reports', label: 'Reports' },
  { href: '/studio/dashboard/settings', label: 'Settings' },
]

export default function StudioNav() {
  const pathname = usePathname()

  return (
    <nav className='flex items-center gap-1'>
      {NAV.map((n) => {
        const active = n.href === '/studio/dashboard'
          ? pathname === '/studio/dashboard'
          : pathname.startsWith(n.href)

        return (
          <Link
            key={n.href}
            href={n.href}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              active
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {n.label}
          </Link>
        )
      })}
    </nav>
  )
}
