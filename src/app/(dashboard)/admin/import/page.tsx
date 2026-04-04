'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ADMIN_EMAIL = 'dom@wrenlist.com'

export default function ImportPage() {
  const router = useRouter()
  const [ebayResult, setEbayResult] = useState<any>(null)
  const [vintedResult, setVintedResult] = useState<any>(null)
  const [ebayLoading, setEbayLoading] = useState(false)
  const [vintedLoading, setVintedLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEbayImport = async () => {
    setEbayLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/ebay/import', { method: 'POST' })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'eBay import failed')
      setEbayResult(data.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setEbayLoading(false)
    }
  }

  const handleVintedImport = async () => {
    setVintedLoading(true)
    setError(null)
    try {
      const EXTENSION_ID = 'nblnainobllgbjkdkpeodjpopkgnpfgb'
      const chrome = (window as any).chrome
      if (!chrome?.runtime) throw new Error('Wrenlist extension not installed — reload extension first')

      const result = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Extension timed out — check Vinted is open and you are logged in')), 120000)
        chrome.runtime.sendMessage(EXTENSION_ID, { action: 'import_vinted' }, (resp: any) => {
          clearTimeout(timeout)
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
          else if (!resp?.ok) reject(new Error(resp?.error || 'Import failed'))
          else resolve(resp)
        })
      })
      setVintedResult(result)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setVintedLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream p-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.back()} className="text-sm text-sage-lt mb-6 block">← Back</button>
        <h1 className="text-2xl font-semibold text-ink mb-2">Import Listings</h1>
        <p className="text-sm text-sage-dim mb-8">Import your existing marketplace listings into Wrenlist. Already-imported items are skipped.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mb-6">{error}</div>
        )}

        {/* eBay Import */}
        <div className="bg-white rounded-lg border border-sage/14 p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-ink">🛒 eBay UK</h2>
              <p className="text-xs text-sage-dim mt-1">Fetches all eBay inventory items via API. Requires eBay connection.</p>
            </div>
            <button
              onClick={handleEbayImport}
              disabled={ebayLoading}
              className="px-4 py-2 bg-ink text-white text-sm rounded-lg hover:bg-ink/90 disabled:opacity-50"
            >
              {ebayLoading ? 'Importing...' : 'Import from eBay'}
            </button>
          </div>
          {ebayResult && (
            <div className="bg-green-50 rounded p-3 text-sm text-green-700">
              ✅ Imported: {ebayResult.imported} · Skipped: {ebayResult.skipped} · Errors: {ebayResult.errors}
            </div>
          )}
        </div>

        {/* Vinted Import */}
        <div className="bg-white rounded-lg border border-sage/14 p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-ink">👗 Vinted</h2>
              <p className="text-xs text-sage-dim mt-1">Fetches listings via the Wrenlist extension. Vinted must be open and you must be logged in.</p>
            </div>
            <button
              onClick={handleVintedImport}
              disabled={vintedLoading}
              className="px-4 py-2 bg-ink text-white text-sm rounded-lg hover:bg-ink/90 disabled:opacity-50"
            >
              {vintedLoading ? 'Importing...' : 'Import from Vinted'}
            </button>
          </div>
          {vintedResult && (
            <div className="bg-green-50 rounded p-3 text-sm text-green-700">
              ✅ Imported: {vintedResult.imported} · Skipped: {vintedResult.skipped} · Total found: {vintedResult.total}
            </div>
          )}
        </div>

        <p className="text-xs text-sage-dim mt-6 text-center">Admin only — dom@wrenlist.com</p>
      </div>
    </div>
  )
}
