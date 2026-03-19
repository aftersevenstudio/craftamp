'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Props {
  studioId: string
  studioName: string
  logoUrl: string | null
  brandColor: string | null
  customDomain: string | null
}

export default function StudioSettingsForm({ studioId, studioName, logoUrl, brandColor, customDomain }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentLogo, setCurrentLogo] = useState(logoUrl)
  const [preview, setPreview] = useState<string | null>(null)
  const [color, setColor] = useState(brandColor ?? '#6366f1')
  const [domain, setDomain] = useState(customDomain ?? '')
  const [savingDomain, setSavingDomain] = useState(false)
  const [domainSaved, setDomainSaved] = useState(false)
  const [domainError, setDomainError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [savingColor, setSavingColor] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [colorSaved, setColorSaved] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setLogoError(null)
  }

  async function handleLogoUpload() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    setLogoError(null)

    const form = new FormData()
    form.append('logo', file)

    const res = await fetch('/api/studio/logo', { method: 'POST', body: form })
    const json = await res.json()

    if (!res.ok) {
      setLogoError(json.error ?? 'Upload failed.')
      setUploading(false)
      return
    }

    setCurrentLogo(json.logoUrl)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploading(false)
    router.refresh()
  }

  async function handleRemoveLogo() {
    setUploading(true)
    await fetch('/api/studio/logo', { method: 'DELETE' })
    setCurrentLogo(null)
    setPreview(null)
    setUploading(false)
    router.refresh()
  }

  async function handleDomainSave() {
    setSavingDomain(true)
    setDomainSaved(false)
    setDomainError(null)

    const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, '')

    const res = await fetch('/api/studio/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_domain: cleaned || null }),
    })

    if (!res.ok) {
      const json = await res.json()
      setDomainError(json.error ?? 'Failed to save.')
    } else {
      setDomain(cleaned)
      setDomainSaved(true)
    }
    setSavingDomain(false)
    router.refresh()
  }

  async function handleColorSave() {
    setSavingColor(true)
    setColorSaved(false)
    await fetch('/api/studio/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand_color: color }),
    })
    setSavingColor(false)
    setColorSaved(true)
    router.refresh()
  }

  const displayLogo = preview ?? currentLogo

  return (
    <div className='space-y-6'>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Studio logo</CardTitle>
          <CardDescription>
            Shown in your clients' portal header. Use a landscape (wide) logo for best results — PNG, JPG, SVG, or WebP, max 2MB.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Preview */}
          <div className='flex items-center gap-4'>
            <div className='w-48 h-16 rounded-lg border bg-gray-50 flex items-center justify-center overflow-hidden px-3'>
              {displayLogo ? (
                <img
                  src={displayLogo}
                  alt={studioName}
                  className='h-8 w-auto max-w-full object-contain'
                />
              ) : (
                <span className='text-xs text-gray-400'>No logo uploaded</span>
              )}
            </div>
            {currentLogo && !preview && (
              <button
                onClick={handleRemoveLogo}
                disabled={uploading}
                className='text-xs text-gray-400 hover:text-red-500 transition-colors'
              >
                Remove
              </button>
            )}
          </div>

          <div className='flex items-center gap-3'>
            <Input
              ref={fileInputRef}
              type='file'
              accept='image/png,image/jpeg,image/svg+xml,image/webp'
              onChange={handleFileChange}
              className='max-w-xs'
            />
            {preview && (
              <Button onClick={handleLogoUpload} disabled={uploading} size='sm'>
                {uploading ? 'Uploading…' : 'Save logo'}
              </Button>
            )}
          </div>

          {logoError && <p className='text-sm text-red-600'>{logoError}</p>}
        </CardContent>
      </Card>

      {/* Brand color */}
      <Card>
        <CardHeader>
          <CardTitle>Brand color</CardTitle>
          <CardDescription>
            Used as the accent color throughout your clients' portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center gap-4'>
            <input
              type='color'
              value={color}
              onChange={(e) => { setColor(e.target.value); setColorSaved(false) }}
              className='h-10 w-16 rounded border cursor-pointer'
            />
            <span className='text-sm font-mono text-gray-600'>{color}</span>
            <Button onClick={handleColorSave} disabled={savingColor} size='sm' variant='outline'>
              {savingColor ? 'Saving…' : 'Save color'}
            </Button>
            {colorSaved && <span className='text-sm text-green-600'>Saved.</span>}
          </div>
        </CardContent>
      </Card>

      {/* Custom domain */}
      <Card>
        <CardHeader>
          <CardTitle>Custom domain</CardTitle>
          <CardDescription>
            Give your clients a fully branded portal URL instead of craftamp.com/{'{'}slug{'}'}.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center gap-3'>
            <Input
              value={domain}
              onChange={(e) => { setDomain(e.target.value); setDomainSaved(false) }}
              placeholder='portal.yourstudio.com'
              className='max-w-xs font-mono text-sm'
            />
            <Button onClick={handleDomainSave} disabled={savingDomain} size='sm' variant='outline'>
              {savingDomain ? 'Saving…' : 'Save domain'}
            </Button>
            {domainSaved && <span className='text-sm text-green-600'>Saved.</span>}
          </div>
          {domainError && <p className='text-sm text-red-600'>{domainError}</p>}

          {domain && !window.location.hostname.includes('localhost') && (
            <div className='rounded-lg border bg-gray-50 p-4 space-y-3 text-sm'>
              <p className='font-medium text-gray-700'>DNS setup instructions</p>
              <p className='text-gray-500'>Add the following CNAME record with your DNS provider:</p>
              <div className='overflow-x-auto rounded border bg-white'>
                <table className='w-full text-xs font-mono'>
                  <thead>
                    <tr className='border-b bg-gray-50'>
                      <th className='px-3 py-2 text-left text-gray-500 font-medium'>Type</th>
                      <th className='px-3 py-2 text-left text-gray-500 font-medium'>Name</th>
                      <th className='px-3 py-2 text-left text-gray-500 font-medium'>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className='px-3 py-2 text-gray-900'>CNAME</td>
                      <td className='px-3 py-2 text-gray-900'>{domain.split('.').slice(0, -2).join('.') || '@'}</td>
                      <td className='px-3 py-2 text-gray-900'>{process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') ?? 'craftamp.com'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className='text-gray-400 text-xs'>DNS changes can take up to 48 hours to propagate. If deploying on Vercel, also add this domain in your Vercel project settings.</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
