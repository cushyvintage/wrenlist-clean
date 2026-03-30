'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendPasswordResetEmail } from '@/services/auth.service'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'confirmation'>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email) {
      setError('Please enter your email address')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)

    try {
      await sendPasswordResetEmail(email)
      setStep('confirmation')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Quote */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sage to-sage-dk flex items-center justify-center p-12">
        <div className="text-center max-w-md">
          <blockquote className="text-lg text-white italic font-light leading-relaxed">
            "The margin tracking alone changed how I price at car boots."
          </blockquote>
          <footer className="text-sage-pale mt-4 text-sm">— Sarah M., Sheffield</footer>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-cream">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-sage rounded flex items-center justify-center text-white font-serif font-bold">
              🌿
            </div>
            <div className="font-serif text-2xl text-ink">
              WREN<em className="italic">list</em>
            </div>
          </div>

          {step === 'email' ? (
            // Step 1: Email input
            <>
              <h1 className="font-serif text-2xl text-ink mb-2">
                Reset your <em className="italic">password.</em>
              </h1>

              <p className="text-ink-lt text-sm mb-8">
                Enter your email and we'll send you a reset link. It expires in 30 minutes.
              </p>

              {/* Error message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 bg-cream-md border border-border rounded text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage disabled:opacity-50"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-6 py-3 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending...' : 'Send reset link'}
                </button>
              </form>

              <div className="border-t border-border my-6"></div>

              <div className="text-center">
                <a
                  href="/login"
                  className="text-sm text-sage-lt hover:text-sage transition font-medium"
                >
                  ← Back to sign in
                </a>
              </div>
            </>
          ) : (
            // Step 2: Confirmation
            <>
              {/* Icon */}
              <div className="w-14 h-14 bg-sage-pale rounded-full flex items-center justify-center mx-auto mb-8">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="var(--sage)" strokeWidth="1.5" fill="none" />
                  <path d="M2 4l10 9 10-9" stroke="var(--sage)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>

              <h1 className="font-serif text-2xl text-ink text-center mb-2">
                Check your <em className="italic">inbox.</em>
              </h1>

              <p className="text-ink-lt text-center mb-8 text-sm leading-relaxed">
                We sent a reset link to <strong className="text-ink">{email}</strong>. If it doesn't appear, check
                your spam folder.
              </p>

              <button
                onClick={() => router.push('/login')}
                className="w-full px-6 py-3 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition mb-4"
              >
                Back to sign in
              </button>

              <div className="text-center text-xs text-ink-lt">
                Didn't receive it?{' '}
                <button
                  onClick={() => setStep('email')}
                  className="text-sage-lt hover:text-sage transition font-medium"
                >
                  Resend →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
