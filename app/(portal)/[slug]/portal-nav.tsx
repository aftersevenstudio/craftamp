'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  links: { href: string; label: string }[]
}

export default function PortalNav({ links }: Props) {
  const pathname = usePathname()

  return (
    <nav className='flex items-center gap-1'>
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + '/')
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              active
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
