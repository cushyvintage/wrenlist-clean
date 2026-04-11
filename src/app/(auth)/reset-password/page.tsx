'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateUserPassword } from '@/services/auth.service'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)

    try {
      await updateUserPassword(password)
      setIsSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
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
                <path d="M6 14l4 4 12-12" stroke="var(--sage)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h1 className="font-serif text-2xl text-ink text-center mb-2">
              Password reset <em className="italic">successful.</em>
            </h1>

            <p className="text-ink-lt text-center mb-8 text-sm leading-relaxed">
              Your password has been updated. You'll be redirected to login in a moment.
            </p>
          </div>
        </div>
      </div>
    )
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
            <img src="/wrenlist-logo.png" alt="Wrenlist" className="w-8 h-8" />
            <div className="font-serif text-2xl text-ink">
              WREN<em className="italic">list</em>
            </div>
          </div>

          <h1 className="font-serif text-2xl text-ink mb-2">
            Create a new <em className="italic">password.</em>
          </h1>

          <p className="text-ink-lt text-sm mb-8">
            Enter a strong password that's different from your previous one.
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password input */}
            <div>
              <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-cream-md border border-border rounded text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage disabled:opacity-50"
                required
              />
              <p className="text-xs text-ink-lt mt-1">At least 8 characters</p>
            </div>

            {/* Confirm password input */}
            <div>
              <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
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
              {isSubmitting ? 'Resetting...' : 'Reset password'}
            </button>
          </form>

          <div className="border-t border-border my-6"></div>

          <div className="text-center">
            <a href="/login" className="text-sm text-sage-lt hover:text-sage transition font-medium">
              ← Back to sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
