'use client'

import { useEffect, useState } from 'react'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import type { Platform } from '@/types'

type PlatformTab = 'master' | 'vinted' | 'etsy' | 'ebay' | 'shopify' | 'depop'

export type GeneratedPlatformCopy = {
  title: string
  description: string
  tags: string[]
}

export type GeneratedListing = Record<PlatformTab, GeneratedPlatformCopy>

interface AIListingPanelProps {
  findId: string
  findName: string
  open: boolean
  onClose: () => void
  onApplied: () => void
}

const TABS: { key: PlatformTab; label: string }[] = [
  { key: 'master', label: 'Master' },
  { key: 'vinted', label: 'Vinted' },
  { key: 'ebay', label: 'eBay' },
  { key: 'etsy', label: 'Etsy' },
  { key: 'shopify', label: 'Shopify' },
  { key: 'depop', label: 'Depop' },
]

export function AIListingPanel({ findId, findName, open, onClose, onApplied }: AIListingPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [listing, setListing] = useState<GeneratedListing | null>(null)
  const [activeTab, setActiveTab] = useState<PlatformTab>('master')
  const [error, setError] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const generate = async () => {
    setIsGenerating(true)
    setError(null)
    setApplyResult(null)
    try {
      const res = await fetch('/api/ai/generate-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error || `Error ${res.status}`)
      }
      const json = await res.json() as { data: GeneratedListing }
      setListing(json.data)
      setActiveTab('master')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    if (!open) return
    // Auto-generate on first open
    if (!listing && !isGenerating) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500)
    } catch {
      // ignore clipboard errors
    }
  }

  const applyMaster = async () => {
    if (!listing) return
    setIsApplying(true)
    setApplyResult(null)
    try {
      // Save master title/description to find
      const mres = await fetch(`/api/finds/${findId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: listing.master.title,
          description: listing.master.description,
        }),
      })
      if (!mres.ok) throw new Error('Failed to save master copy')

      // Persist per-platform variants into platform_fields.ai
      const aiBucket = {
        vinted: listing.vinted,
        etsy: listing.etsy,
        ebay: listing.ebay,
        shopify: listing.shopify,
        depop: listing.depop,
        generated_at: new Date().toISOString(),
      }

      const fres = await fetch(`/api/finds/${findId}`)
      const fjson = await fres.json() as { data?: { platform_fields?: Record<string, unknown> } }
      const existing = fjson.data?.platform_fields || {}
      const nextPlatformFields = { ...existing, ai: aiBucket }

      const pres = await fetch(`/api/finds/${findId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform_fields: nextPlatformFields }),
      })
      if (!pres.ok) throw new Error('Failed to save per-platform copy')

      setApplyResult('Applied to find. Per-platform copy saved under platform_fields.ai.')
      onApplied()
    } catch (err) {
      setApplyResult(err instanceof Error ? err.message : 'Apply failed')
    } finally {
      setIsApplying(false)
    }
  }

  if (!open) return null

  const currentCopy = listing?.[activeTab]

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,.3)' }}
      onClick={onClose}
    >
      <div
        className="bg-white border-l border-sage/20 shadow-lg w-full max-w-2xl h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sage/14">
          <div>
            <div className="text-xs uppercase tracking-widest text-sage-dim font-medium">Wren AI</div>
            <h2 className="text-lg font-medium text-ink">Generated listing copy</h2>
            <div className="text-xs text-ink-lt mt-0.5 truncate max-w-md">for "{findName}"</div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-lt hover:text-ink transition-colors"
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        {/* Tab bar */}
        {listing && (
          <div className="flex items-center gap-1 px-4 border-b border-sage/14 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition ${
                  activeTab === t.key
                    ? 'border-sage text-sage'
                    : 'border-transparent text-ink-lt hover:text-ink'
                }`}
              >
                {t.key !== 'master' && <MarketplaceIcon platform={t.key as Platform} size="sm" />}
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 px-3 py-2 rounded bg-red-50 border border-red-200 text-sm text-red-700">
              {error}{' '}
              <button onClick={generate} className="underline hover:no-underline ml-2">
                retry
              </button>
            </div>
          )}

          {isGenerating && !listing && (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3 text-sm text-ink-lt">
                <div className="w-2 h-2 rounded-full bg-sage animate-pulse" />
                <span>Wren is writing your listing…</span>
              </div>
            </div>
          )}

          {currentCopy && (
            <div className="space-y-5">
              <CopyField
                label="Title"
                copyId={`${activeTab}-title`}
                copiedKey={copiedKey}
                value={currentCopy.title}
                onCopy={copy}
                meta={`${currentCopy.title.length} characters`}
              />
              <CopyField
                label="Description"
                copyId={`${activeTab}-desc`}
                copiedKey={copiedKey}
                value={currentCopy.description}
                onCopy={copy}
                multiline
                meta={`${currentCopy.description.split(/\s+/).filter(Boolean).length} words`}
              />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-ink-lt uppercase tracking-wide">
                    Tags
                  </label>
                  <button
                    onClick={() => copy(`${activeTab}-tags`, currentCopy.tags.join(', '))}
                    className="text-xs text-sage hover:text-sage-dk"
                  >
                    {copiedKey === `${activeTab}-tags` ? 'copied' : 'copy all'}
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {currentCopy.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 text-xs rounded bg-sage-pale text-sage-dk"
                    >
                      {tag}
                    </span>
                  ))}
                  {currentCopy.tags.length === 0 && (
                    <span className="text-xs text-ink-lt">No tags suggested.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-sage/14 flex items-center justify-between gap-3">
          <div className="text-xs text-ink-lt flex-1 truncate">
            {applyResult ?? (listing ? 'Review each tab. Apply saves master + platform variants.' : '')}
          </div>
          <div className="flex gap-2">
            <button
              onClick={generate}
              disabled={isGenerating}
              className="px-3 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition disabled:opacity-50"
            >
              {isGenerating ? 'Regenerating…' : 'Regenerate'}
            </button>
            <button
              onClick={applyMaster}
              disabled={!listing || isApplying}
              className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
            >
              {isApplying ? 'Saving…' : 'Apply to find'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CopyField({
  label,
  copyId,
  copiedKey,
  value,
  onCopy,
  multiline,
  meta,
}: {
  label: string
  copyId: string
  copiedKey: string | null
  value: string
  onCopy: (key: string, value: string) => void
  multiline?: boolean
  meta?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-medium text-ink-lt uppercase tracking-wide">
          {label}
        </label>
        <button
          onClick={() => onCopy(copyId, value)}
          className="text-xs text-sage hover:text-sage-dk"
        >
          {copiedKey === copyId ? 'copied' : 'copy'}
        </button>
      </div>
      {multiline ? (
        <textarea
          value={value}
          readOnly
          rows={10}
          className="w-full px-3 py-2 bg-cream-md border border-border rounded text-sm text-ink font-light"
        />
      ) : (
        <input
          type="text"
          value={value}
          readOnly
          className="w-full px-3 py-2 bg-cream-md border border-border rounded text-sm text-ink"
        />
      )}
      {meta && <div className="text-xs text-ink-lt mt-1">{meta}</div>}
    </div>
  )
}
