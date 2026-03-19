import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Craftamp — Client portals for agencies',
  description:
    'Give your clients a branded home for reports, insights, and local opportunities — generated automatically every month.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${outfit.variable} font-[family-name:var(--font-outfit)]`}>
      {children}
    </div>
  )
}
