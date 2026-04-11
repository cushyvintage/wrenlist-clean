'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentUser } from '@/services/auth.service'
import { resendVerificationEmail } from '@/services/auth.service'

function VerifyEmailInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Email arrives via query param from the register flow (?email=...). Fall
  // back to the current auth user if present (e.g. user hit this page
  // directly after logging in to an unverified account).
  const [email, setEmail] = useState(() => searchParams.get('email') || '')
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(!searchParams.get('email'))

  useEffect(() => {
    if (email) return // already have it from query param

    const getEmail = async () => {
      try {
        const user = await getCurrentUser()
        if (user?.email) setEmail(user.email)
      } catch (err) {
        console.error('Failed to get user:', err)
      } finally {
        setIsLoading(false)
      }
    }

    getEmail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleResend = async () => {
    if (!email) return

    setIsResending(true)
    setMessage(null)

    try {
      await resendVerificationEmail(email)
      setMessage({ type: 'success', text: 'Verification email sent! Check your inbox.' })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to resend email',
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Quote */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sage to-sage-dk flex items-center justify-center p-12">
        <div className="text-center max-w-md">
          <blockquote className="text-lg text-white italic font-light leading-relaxed">
            "I set up Wrenlist in the car park before my first car boot. Worth every second."
          </blockquote>
          <footer className="text-sage-pale mt-4 text-sm">— Marcus T., Bristol</footer>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-cream">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-12">
            <img src="/wrenlist-logo.png" alt="Wrenlist" className="w-8 h-8" />
            <div className="font-serif text-2xl text-ink">
              WREN<em className="italic">list</em>
            </div>
          </div>

          {/* Icon */}
          <div className="w-16 h-16 bg-sage-pale rounded-full flex items-center justify-center mx-auto mb-8">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="5" width="24" height="18" rx="2" stroke="var(--sage)" strokeWidth="1.5" />
              <path d="M2 5l12 11L26 5" stroke="var(--sage)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="font-serif text-2xl text-ink text-center mb-2">
            Verify your <em className="italic">email.</em>
          </h1>

          {/* Description */}
          <p className="text-ink-lt text-center mb-8 text-sm leading-relaxed">
            We sent a verification link to <strong className="text-ink">{isLoading ? 'your email' : email || 'you'}</strong>. Click the link
            to activate your account — it's the last step before you start listing.
          </p>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Main CTA */}
          <a
            href="/login"
            className="block w-full px-6 py-3 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition mb-4 text-center"
          >
            Go to Login →
          </a>

          {/* Secondary actions */}
          <div className="space-y-2 text-center text-xs text-ink-lt">
            <div>
              Didn't get it?{' '}
              <button
                onClick={handleResend}
                disabled={isResending || isLoading}
                className="text-sage-lt hover:text-sage transition font-medium disabled:opacity-50"
              >
                {isResending ? 'Resending...' : 'Resend verification email'}
              </button>
            </div>
            <div>
              Wrong address?{' '}
              <button
                onClick={() => router.push('/register')}
                className="text-sage-lt hover:text-sage transition font-medium"
              >
                Change email →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  )
}
