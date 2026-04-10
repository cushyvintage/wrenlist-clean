'use client'

import { useEffect, useState, use } from 'react'
import QRCode from 'qrcode'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { unwrapApiResponse } from '@/lib/api-utils'
import type { Stash } from '@/types'

export default function StashLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [stash, setStash] = useState<Stash | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/stashes/${id}`)
      const json = await res.json()
      const detail = unwrapApiResponse<{ stash: Stash }>(json)
      if (detail?.stash) {
        setStash(detail.stash)
        const url = `${window.location.origin}/stashes/${id}`
        const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 })
        setQrDataUrl(dataUrl)
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="p-6 text-sage-dim text-sm">Loading…</div>
  if (!stash) return <div className="p-6 text-red-600 text-sm">Stash not found</div>

  return (
    <>
      <div className="max-w-3xl mx-auto p-6 print:hidden">
        <Link href={`/stashes/${id}`} className="inline-flex items-center gap-1 text-xs text-sage-dim hover:text-sage mb-4">
          <ArrowLeft className="w-3 h-3" /> Back to stash
        </Link>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-ink">Print label</h1>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm rounded hover:bg-sage-lt"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
        <p className="text-xs text-sage-dim mb-6">
          Stick this label on the box. Scan it from the add-find form to auto-assign items.
        </p>
      </div>

      <div className="stash-label mx-auto bg-white border-2 border-black text-center print:border-2">
        <div className="text-xs uppercase tracking-widest mb-2 text-gray-600">Wrenlist stash</div>
        <div className="text-3xl font-bold text-black break-words leading-tight mb-4">{stash.name}</div>
        {qrDataUrl && (
          // data: URLs can't be optimised by next/image, so plain <img> is correct here
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt={`QR for ${stash.name}`} className="mx-auto" style={{ width: 300, height: 300 }} />
        )}
        {stash.note && <div className="text-sm text-gray-700 mt-3 italic">{stash.note}</div>}
        <div className="text-[10px] text-gray-500 mt-2 font-mono">{stash.id.slice(0, 8)}</div>
      </div>

      <style jsx>{`
        .stash-label {
          width: 400px;
          padding: 24px;
        }
        @media print {
          @page { margin: 12mm; }
          .stash-label { border: 2px solid black; }
        }
      `}</style>
    </>
  )
}
