'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ScanLine } from 'lucide-react'
import StashTypeahead from '@/components/stash/StashTypeahead'

// Dynamic import — html5-qrcode is browser-only and pulls in camera libs
const StashQrScanner = dynamic(() => import('@/components/stash/StashQrScanner'), { ssr: false })

interface StashSectionProps {
  stashId: string | null
  onChange: (stashId: string | null) => void
}

/**
 * StashSection — physical storage location picker for add-find form.
 * Sticky: remembers selection in localStorage across form submits so
 * unpacking-a-box workflows don't repeat the pick.
 * Supports QR-scan from printed stash labels.
 */
export default function StashSection({ stashId, onChange }: StashSectionProps) {
  const [scanning, setScanning] = useState(false)

  const handleChange = (id: string | null) => {
    onChange(id)
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('wrenlist:stickyStashId', id)
      else localStorage.removeItem('wrenlist:stickyStashId')
    }
  }

  const handleScanned = (scannedId: string) => {
    setScanning(false)
    handleChange(scannedId)
  }

  return (
    <div className="bg-white rounded-lg border border-sage/14 p-6">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-semibold text-ink">Stash</label>
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-sage hover:bg-sage/10 rounded"
          title="Scan stash QR label"
        >
          <ScanLine className="w-3.5 h-3.5" /> Scan label
        </button>
      </div>
      <p className="text-xs text-sage-dim mb-3">
        Where is this item stored? Remembered for your next find.
      </p>
      <StashTypeahead value={stashId} onChange={handleChange} />
      {scanning && <StashQrScanner onScan={handleScanned} onClose={() => setScanning(false)} />}
    </div>
  )
}
