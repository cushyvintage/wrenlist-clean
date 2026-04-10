'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/services/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Password strength
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const strengthChecks = [hasMinLength, hasUppercase, hasNumber].filter(Boolean).length
  const strengthLabel = strengthChecks === 3 ? 'Strong' : strengthChecks === 2 ? 'Fair' : 'Weak'
  const strengthColor = strengthChecks === 3 ? 'bg-green-400' : strengthChecks === 2 ? 'bg-yellow-400' : 'bg-red-300'
  const strengthTextColor = strengthChecks === 3 ? 'text-green-600' : strengthChecks === 2 ? 'text-yellow-600' : 'text-red-600'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!firstName.trim() || !lastName.trim() || !email || !password) {
      setError('Please fill in all fields')
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

    setIsLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`,
          },
        },
      })

      if (signUpError) throw signUpError
      if (!data.user) throw new Error('User creation failed')

      // Profile is created by DB trigger from auth metadata
      router.push(`/verify-email?email=${encodeURIComponent(email)}`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create account'
      // Handle "User already registered" error
      if (errorMsg.includes('already registered')) {
        setError('An account with this email already exists')
      } else {
        setError(errorMsg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up with Google')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/wrenlist-logo.png"
            alt="Wrenlist"
            className="w-16 h-16 mx-auto mb-3"
          />
          <h1 className="font-serif text-3xl text-ink mb-2">Wrenlist</h1>
          <p className="text-ink-lt text-sm">The operating system for thrifters</p>
        </div>

        {/* Beta banner */}
        <div className="mb-6 px-4 py-3 bg-sage/10 border border-sage/20 rounded text-sm text-ink-md text-center flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sage animate-pulse" />
          Open Beta — all features free for 3 months. No card needed.
        </div>

        {/* Register card */}
        <div className="bg-white border border-sage/14 rounded-lg p-8">
          <h2 className="text-2xl font-serif text-ink mb-2">Create your <span className="italic">account</span></h2>
          <p className="text-ink-lt text-sm mb-6">All features unlocked. We just want your feedback.</p>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Google Sign-up Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isLoading}
            className="w-full mb-4 px-4 py-2.5 border border-sage/14 rounded font-medium text-ink hover:bg-cream transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#4285F4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign up with Google
          </button>

          {/* Divider */}
          <div className="my-4 flex items-center gap-4">
            <div className="flex-1 h-px bg-sage/14" />
            <div className="text-xs text-ink-lt">or sign up with email</div>
            <div className="flex-1 h-px bg-sage/14" />
          </div>

          {/* Register form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jordan"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Kirk"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30 disabled:opacity-50"
                />
              </div>
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
                placeholder="Min 8 characters"
                required
                disabled={isLoading}
                className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30 disabled:opacity-50"
              />
              {password && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i < strengthChecks ? strengthColor : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${strengthTextColor}`}>
                      {strengthLabel}
                    </span>
                    <div className="text-xs text-ink-lt space-x-2">
                      <span className={hasMinLength ? 'text-green-600' : ''}>8+ chars</span>
                      <span className={hasUppercase ? 'text-green-600' : ''}>uppercase</span>
                      <span className={hasNumber ? 'text-green-600' : ''}>number</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pricing preview */}
            <div className="pt-2">
              <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-3">
                Plans after beta
              </label>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { name: 'Free', price: 0, finds: '10 finds/mo' },
                  { name: 'Nester', price: 14, finds: '100 finds/mo' },
                  { name: 'Forager', price: 29, finds: '500 finds/mo', popular: true },
                  { name: 'Flock', price: 59, finds: 'Unlimited' },
                ].map((plan) => (
                  <div
                    key={plan.name}
                    className="relative p-3 border border-sage/14 rounded text-center opacity-60"
                  >
                    {plan.popular && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 bg-sage text-white text-xs font-medium rounded-full">
                        POPULAR
                      </div>
                    )}
                    <div className="font-medium text-ink">{plan.name}</div>
                    <div className="text-lg font-semibold text-sage mt-1">&pound;{plan.price}</div>
                    <div className="text-xs text-ink-lt mt-1">{plan.finds}</div>
                  </div>
                ))}
              </div>
              <p className="text-center text-xs text-sage-dim mt-2">
                Beta users get all features free for 3 months
              </p>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 px-4 py-2.5 bg-sage text-white hover:bg-sage-dk rounded font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating account...' : 'Create account — start free'}
            </button>

            {/* Terms */}
            <p className="text-center text-xs text-ink-lt mt-4">
              By signing up you agree to our{' '}
              <a href="/terms" className="text-sage-lt hover:text-sage font-medium">
                Terms
              </a>
              {' '}and{' '}
              <a href="/privacy" className="text-sage-lt hover:text-sage font-medium">
                Privacy Policy
              </a>
            </p>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-ink-lt mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-sage-lt hover:text-sage font-medium transition-colors">
              Sign in →
            </a>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-ink-lt space-y-1">
          <p>Wrenlist is a SaaS for UK resellers</p>
          <p>
            <a href="/terms" className="text-sage-lt hover:text-sage transition-colors">
              Terms of Service
            </a>
            {' · '}
            <a href="/privacy" className="text-sage-lt hover:text-sage transition-colors">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
