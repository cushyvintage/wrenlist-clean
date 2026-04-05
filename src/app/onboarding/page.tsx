'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { unwrapApiResponse } from '@/lib/api-utils'
import type { Profile } from '@/types'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuthContext()
  const [step, setStep] = useState(1)
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Get Started | Wrenlist'
  }, [])

  // Fetch current profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profiles')
        const result = await res.json()
        const profile = unwrapApiResponse<Profile>(result)
        setDisplayName(profile.full_name || '')
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      }
    }

    if (user) {
      fetchProfile()
    }
  }, [user])

  const handleContinue = () => {
    setStep(step + 1)
  }

  const handleSkip = () => {
    setStep(step + 1)
  }

  const handleComplete = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Update display name if changed
      if (displayName.trim()) {
        const updateRes = await fetch('/api/profiles', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: displayName.trim() }),
        })

        if (!updateRes.ok) {
          throw new Error('Failed to update profile')
        }
      }

      // Mark onboarding as complete
      const onboardRes = await fetch('/api/profiles/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!onboardRes.ok) {
        throw new Error('Failed to complete onboarding')
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      setIsLoading(false)
    }
  }

  const progressPercent = (step / 3) * 100

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Progress Bar */}
      <div className="h-1 bg-sage/20">
        <div
          className="h-full bg-sage transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Step Indicator */}
          <div className="mb-8 text-center">
            <p className="text-sm text-sage mb-4">Step {step} of 3</p>
            <h1 className="text-3xl font-bold text-ink mb-2">
              {step === 1 && 'Connect a Platform'}
              {step === 2 && 'Add Your First Find'}
              {step === 3 && 'You\'re All Set!'}
            </h1>
            <p className="text-sage text-lg">
              {step === 1 && 'Start selling on your favourite marketplace'}
              {step === 2 && 'Create your first product listing'}
              {step === 3 && 'Complete your profile'}
            </p>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-lg border-2 border-sage/30 p-8 mb-8">
            {step === 1 && (
              <div className="space-y-6">
                <p className="text-sage mb-6">
                  Connect your marketplace account to start listing items.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Vinted Card */}
                  <a
                    href="/platform-connect"
                    className="group block p-6 border-2 border-sage/30 rounded-lg hover:border-sage hover:bg-cream/50 transition-all"
                  >
                    <div className="mb-3"><MarketplaceIcon platform="vinted" size="lg" /></div>
                    <h3 className="font-semibold text-ink mb-2">Vinted</h3>
                    <p className="text-sm text-sage">Fast, mobile-first marketplace for second-hand items</p>
                    <div className="mt-4 inline-flex items-center text-sage group-hover:text-ink transition-colors">
                      Connect
                      <span className="ml-2">→</span>
                    </div>
                  </a>

                  {/* eBay Card */}
                  <a
                    href="/platform-connect"
                    className="group block p-6 border-2 border-sage/30 rounded-lg hover:border-sage hover:bg-cream/50 transition-all"
                  >
                    <div className="mb-3"><MarketplaceIcon platform="ebay" size="lg" /></div>
                    <h3 className="font-semibold text-ink mb-2">eBay UK</h3>
                    <p className="text-sm text-sage">Global marketplace with auction and fixed-price listings</p>
                    <div className="mt-4 inline-flex items-center text-sage group-hover:text-ink transition-colors">
                      Connect
                      <span className="ml-2">→</span>
                    </div>
                  </a>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <p className="text-sage mb-6">
                  Create or import your first product listing to get started.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Create New Find */}
                  <a
                    href="/add-find"
                    className="group block p-6 border-2 border-sage/30 rounded-lg hover:border-sage hover:bg-cream/50 transition-all"
                  >
                    <div className="text-3xl mb-3">➕</div>
                    <h3 className="font-semibold text-ink mb-2">Create New Find</h3>
                    <p className="text-sm text-sage">List a new item from scratch</p>
                    <div className="mt-4 inline-flex items-center text-sage group-hover:text-ink transition-colors">
                      Start
                      <span className="ml-2">→</span>
                    </div>
                  </a>

                  {/* Bulk Import */}
                  <a
                    href="/bulk-upload"
                    className="group block p-6 border-2 border-sage/30 rounded-lg hover:border-sage hover:bg-cream/50 transition-all"
                  >
                    <div className="text-3xl mb-3">📤</div>
                    <h3 className="font-semibold text-ink mb-2">Import Listings</h3>
                    <p className="text-sm text-sage">Upload multiple items via CSV</p>
                    <div className="mt-4 inline-flex items-center text-sage group-hover:text-ink transition-colors">
                      Import
                      <span className="ml-2">→</span>
                    </div>
                  </a>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <p className="text-sage mb-6">
                  Add a display name so buyers know who they're buying from.
                </p>

                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-ink mb-2">
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. CushyVintage"
                    className="w-full px-4 py-3 border-2 border-sage/30 rounded-lg focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 text-ink placeholder-sage/50"
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-between">
            {step < 3 && (
              <>
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 text-sage hover:text-ink transition-colors font-medium"
                >
                  Skip
                </button>
                <button
                  onClick={handleContinue}
                  className="px-8 py-3 bg-sage text-cream rounded-lg hover:bg-sage-dark transition-colors font-medium"
                >
                  Continue
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 text-sage hover:text-ink transition-colors font-medium"
                >
                  Skip
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="px-8 py-3 bg-sage text-cream rounded-lg hover:bg-sage-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Completing...' : 'Get Started'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
