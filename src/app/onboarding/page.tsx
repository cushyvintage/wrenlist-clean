'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/services/supabase'

type OnboardingStep = 'welcome' | 'marketplace' | 'first-find'

interface ExtensionStatus {
  installed: boolean
  version?: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [firstName, setFirstName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>({ installed: false })
  const [error, setError] = useState<string | null>(null)

  // Check if user is authenticated and has completed onboarding
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Get profile to check onboarding status and name
        const { data: profile } = await supabase
          .from('profiles')
          .select('has_completed_onboarding, full_name')
          .eq('user_id', user.id)
          .single()

        if (profile?.has_completed_onboarding) {
          router.push('/dashboard')
          return
        }

        if (profile?.full_name) {
          const firstPart = profile.full_name.split(' ')[0]
          setFirstName(firstPart)
        }
      } catch (err) {
        console.error('Error checking user:', err)
      } finally {
        setIsLoading(false)
      }
    }

    checkUser()
  }, [router])

  // Check for extension
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkExtension = () => {
        try {
          chrome.runtime.sendMessage(
            'YOUR_EXTENSION_ID',
            { action: 'ping' },
            (response) => {
              if (response && response.success) {
                setExtensionStatus({ installed: true, version: response.version })
              }
            }
          )
        } catch (err) {
          setExtensionStatus({ installed: false })
        }
      }

      checkExtension()
    }
  }, [])

  const handleSkipMarketplace = () => {
    setStep('first-find')
  }

  const handleCompleteOnboarding = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      await supabase
        .from('profiles')
        .update({ has_completed_onboarding: true })
        .eq('user_id', user.id)

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding')
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage mx-auto mb-4"></div>
        <p className="text-ink-lt">Setting up your account...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="font-serif text-3xl text-ink mb-2">Wrenlist</h1>
        <p className="text-ink-lt text-sm">The operating system for thrifters</p>
      </div>

      {/* Progress indicator */}
      <div className="mb-10 flex items-center justify-center gap-2">
        {(['welcome', 'marketplace', 'first-find'] as const).map((s, idx) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                step === s
                  ? 'bg-sage'
                  : (['welcome', 'marketplace', 'first-find'].indexOf(step) > idx ? 'bg-sage/30' : 'bg-sage/10')
              }`}
            />
            {idx < 2 && <div className="w-8 h-px mx-1.5 bg-sage/10" />}
          </div>
        ))}
      </div>

      {/* Step: Welcome */}
      {step === 'welcome' && (
        <div className="bg-white border border-sage/14 rounded-lg p-8">
          <h2 className="text-2xl font-serif text-ink mb-3">
            Welcome{firstName ? `, ${firstName}` : ''}
          </h2>
          <p className="text-ink-lt text-sm mb-8 leading-relaxed">
            Track your finds, price with confidence, list everywhere at once.
          </p>

          <button
            onClick={() => setStep('marketplace')}
            className="w-full px-4 py-2.5 bg-sage text-white hover:bg-sage-dk rounded font-medium transition-colors"
          >
            Let's set you up →
          </button>
        </div>
      )}

      {/* Step: Marketplace Connect */}
      {step === 'marketplace' && (
        <div className="bg-white border border-sage/14 rounded-lg p-8">
          <h2 className="text-2xl font-serif text-ink mb-2">Connect a <span className="italic">marketplace</span></h2>
          <p className="text-ink-lt text-sm mb-6">
            Link where you sell to automatically sync your listings and track sales.
          </p>

          <div className="space-y-3 mb-6">
            {/* Vinted */}
            <div className="p-4 border border-sage/14 rounded hover:bg-cream/50 transition cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 flex items-center justify-center text-lg">👚</div>
                <div className="font-medium text-ink">Vinted</div>
              </div>
              <p className="text-xs text-ink-lt">
                Requires the Wrenlist{' '}
                <a
                  href="https://chromewebstore.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sage hover:text-sage-dk"
                >
                  browser extension
                </a>
              </p>
            </div>

            {/* eBay */}
            <div className="p-4 border border-sage/14 rounded hover:bg-cream/50 transition cursor-pointer opacity-60">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 flex items-center justify-center text-lg">🛒</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">eBay</span>
                  <span className="px-2 py-0.5 text-xs font-semibold text-amber bg-amber-50 rounded">
                    coming soon
                  </span>
                </div>
              </div>
              <p className="text-xs text-ink-lt">Connect with OAuth to sync your eBay listings</p>
            </div>

            {/* Etsy */}
            <div className="p-4 border border-sage/14 rounded hover:bg-cream/50 transition cursor-pointer opacity-60">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 flex items-center justify-center text-lg">🎨</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">Etsy</span>
                  <span className="px-2 py-0.5 text-xs font-semibold text-amber bg-amber-50 rounded">
                    coming soon
                  </span>
                </div>
              </div>
              <p className="text-xs text-ink-lt">Connect to reach vintage enthusiasts on Etsy</p>
            </div>

            {/* Shopify */}
            <div className="p-4 border border-sage/14 rounded hover:bg-cream/50 transition cursor-pointer opacity-60">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 flex items-center justify-center text-lg">🏪</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">Shopify</span>
                  <span className="px-2 py-0.5 text-xs font-semibold text-amber bg-amber-50 rounded">
                    coming soon
                  </span>
                </div>
              </div>
              <p className="text-xs text-ink-lt">Crosslist to your own Shopify store</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('welcome')}
              className="flex-1 px-4 py-2 border border-sage/14 rounded font-medium text-ink hover:bg-cream transition"
            >
              ← Back
            </button>
            <button
              onClick={handleSkipMarketplace}
              className="flex-1 px-4 py-2 text-sage hover:text-sage-dk font-medium transition"
            >
              I'll connect later →
            </button>
          </div>
        </div>
      )}

      {/* Step: First Find */}
      {step === 'first-find' && (
        <div className="bg-white border border-sage/14 rounded-lg p-8">
          <h2 className="text-2xl font-serif text-ink mb-3">You're all <span className="italic">set.</span></h2>
          <p className="text-ink-lt text-sm mb-8">
            Add your first find to start tracking your inventory and pricing.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/add-find')}
              className="flex-1 px-4 py-2.5 bg-sage text-white hover:bg-sage-dk rounded font-medium transition-colors"
            >
              Add my first find →
            </button>
            <button
              onClick={handleCompleteOnboarding}
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 border border-sage/14 text-ink hover:bg-cream rounded font-medium transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Loading...' : 'Explore dashboard →'}
            </button>
          </div>

          {/* Back button */}
          <button
            onClick={() => setStep('marketplace')}
            className="w-full mt-3 px-4 py-2 text-sage hover:text-sage-dk font-medium text-sm transition"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}
