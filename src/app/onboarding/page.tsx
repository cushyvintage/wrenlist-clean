'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'

/**
 * Onboarding: single welcome screen.
 *
 * Every action marks onboarding_completed BEFORE navigating, so the user can
 * leave this page (to connect a platform, add a find, etc.) without getting
 * bounced back here by the middleware on the next request.
 */
export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuthContext()
  const [isBusy, setIsBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Welcome | Wrenlist'
  }, [])

  const firstName = (user?.full_name || '').trim().split(/\s+/)[0] || null

  const markCompleteAndGo = async (destination: string, key: string) => {
    setError(null)
    setIsBusy(key)

    try {
      const res = await fetch('/api/profiles/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        throw new Error('Could not complete onboarding')
      }

      router.push(destination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsBusy(null)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl text-ink mb-3">
            Welcome{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="text-ink-lt text-lg">
            You're in. Where would you like to start?
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700 text-center">
            {error}
          </div>
        )}

        {/* Action tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Tile 1: Connect a marketplace */}
          <button
            type="button"
            onClick={() => markCompleteAndGo('/platform-connect', 'connect')}
            disabled={!!isBusy}
            className="group text-left p-6 bg-white border border-sage/14 rounded-lg hover:border-sage/40 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 mb-4">
              <MarketplaceIcon platform="vinted" size="sm" />
              <MarketplaceIcon platform="ebay" size="sm" />
              <MarketplaceIcon platform="etsy" size="sm" />
              <span className="text-xs text-ink-lt">+7 more</span>
            </div>
            <h3 className="font-medium text-ink mb-2">Connect a marketplace</h3>
            <p className="text-sm text-ink-lt mb-4">
              Link Vinted, eBay, Etsy and more so you can publish and delist from Wrenlist.
            </p>
            <span className="text-sm text-sage-lt group-hover:text-sage font-medium">
              {isBusy === 'connect' ? 'Opening...' : 'Connect →'}
            </span>
          </button>

          {/* Tile 2: Add your first find */}
          <button
            type="button"
            onClick={() => markCompleteAndGo('/add-find', 'add')}
            disabled={!!isBusy}
            className="group text-left p-6 bg-white border border-sage/14 rounded-lg hover:border-sage/40 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-full bg-sage/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="font-medium text-ink mb-2">Add your first find</h3>
            <p className="text-sm text-ink-lt mb-4">
              Snap a photo, let AI fill in the details, and get a listing ready in under a minute.
            </p>
            <span className="text-sm text-sage-lt group-hover:text-sage font-medium">
              {isBusy === 'add' ? 'Opening...' : 'Add a find →'}
            </span>
          </button>

          {/* Tile 3: Take a look around */}
          <button
            type="button"
            onClick={() => markCompleteAndGo('/dashboard', 'explore')}
            disabled={!!isBusy}
            className="group text-left p-6 bg-white border border-sage/14 rounded-lg hover:border-sage/40 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-full bg-sage/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <h3 className="font-medium text-ink mb-2">Take a look around</h3>
            <p className="text-sm text-ink-lt mb-4">
              Head to the dashboard and explore Wrenlist at your own pace. You can connect platforms later.
            </p>
            <span className="text-sm text-sage-lt group-hover:text-sage font-medium">
              {isBusy === 'explore' ? 'Loading...' : 'Go to dashboard →'}
            </span>
          </button>
        </div>

        {/* Beta reassurance footer */}
        <div className="text-center text-xs text-ink-lt">
          <p className="flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sage" />
            Open Beta — all features free for 3 months. You can explore anything.
          </p>
        </div>
      </div>
    </div>
  )
}
