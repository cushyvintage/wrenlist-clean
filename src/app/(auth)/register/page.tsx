'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerUser } from '@/services/auth.service'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!fullName.trim() || !email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
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

    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service')
      return
    }

    setIsLoading(true)

    try {
      await registerUser(email, password)
      // TODO: Save fullName to profile after registration
      router.push('/verify-email')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-ink mb-2">Wrenlist</h1>
          <p className="text-ink-lt text-sm">The operating system for thrifters</p>
        </div>

        {/* Register card */}
        <div className="bg-white border border-sage/14 rounded-lg p-8">
          <h2 className="text-xl font-medium text-ink mb-6">Create your account</h2>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Register form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name input */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                required
                disabled={isLoading}
                className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30 disabled:opacity-50"
              />
            </div>

            {/* Email input */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isLoading}
                className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30 disabled:opacity-50"
              />
            </div>

            {/* Password input */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
                className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30 disabled:opacity-50"
              />
              <p className="text-xs text-ink-lt mt-1">At least 8 characters</p>
            </div>

            {/* Confirm password input */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
                className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30 disabled:opacity-50"
              />
            </div>

            {/* Terms checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  disabled={isLoading}
                  className="mt-1 cursor-pointer disabled:opacity-50"
                />
                <span className="text-sm text-ink-lt">
                  I agree to the{' '}
                  <a href="#" className="text-sage-lt hover:text-sage font-medium">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-sage-lt hover:text-sage font-medium">
                    Privacy Policy
                  </a>
                </span>
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 px-4 py-2.5 bg-sage text-white hover:bg-sage-dk rounded font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-sage/14" />
            <div className="text-xs text-ink-lt">OR</div>
            <div className="flex-1 h-px bg-sage/14" />
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-ink-lt">
            Already have an account?{' '}
            <a href="/login" className="text-sage-lt hover:text-sage font-medium transition-colors">
              Log in
            </a>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-ink-lt space-y-1">
          <p>Wrenlist is a SaaS for UK resellers</p>
          <p>
            <a href="#" className="text-sage-lt hover:text-sage transition-colors">
              Terms of Service
            </a>
            {' · '}
            <a href="#" className="text-sage-lt hover:text-sage transition-colors">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
