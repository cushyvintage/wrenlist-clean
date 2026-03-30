'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function VerifyEmailPage() {
  const router = useRouter()
  const [isResending, setIsResending] = useState(false)

  const handleResend = async () => {
    setIsResending(true)
    // Simulate API call
    setTimeout(() => setIsResending(false), 1000)
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
            <div className="w-8 h-8 bg-sage rounded flex items-center justify-center text-white font-serif font-bold">
              🌿
            </div>
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
            We sent a verification link to <strong className="text-ink">jordan@example.com</strong>. Click the link
            to activate your account — it's the last step before you start listing.
          </p>

          {/* Main CTA */}
          <button
            onClick={() => router.push('/app/dashboard')}
            className="w-full px-6 py-3 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition mb-4"
          >
            I've verified — continue →
          </button>

          {/* Secondary actions */}
          <div className="space-y-2 text-center text-xs text-ink-lt">
            <div>
              Didn't get it?{' '}
              <button
                onClick={handleResend}
                disabled={isResending}
                className="text-sage-lt hover:text-sage transition font-medium"
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
