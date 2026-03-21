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
  portalUrl: string
}

export default function StudioSettingsForm({ studioId, studioName, logoUrl, brandColor, customDomain, portalUrl }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentLogo, setCurrentLogo] = useState(logoUrl)
  const [preview, setPreview] = useState<string | null>(null)
  const [color, setColor] = useState(brandColor ?? '#6366f1')
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

      {/* Portal URL */}
      <Card>
        <CardHeader>
          <CardTitle>Client portal URL</CardTitle>
          <CardDescription>
            Share this link with your clients so they can access their portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center gap-3'>
            <input
              readOnly
              value={portalUrl}
              className='flex-1 max-w-xs rounded-md border bg-gray-50 px-3 py-2 text-sm font-mono text-gray-600 outline-none'
              onFocus={(e) => e.target.select()}
            />
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={() => navigator.clipboard.writeText(portalUrl)}
            >
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
