'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginUser } from '@/services/auth.service'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await loginUser(email, password)
      router.push('/app/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log in')
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

        {/* Login card */}
        <div className="bg-white border border-sage/14 rounded-lg p-8">
          <h2 className="text-xl font-medium text-ink mb-6">Log in to your account</h2>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 px-4 py-2.5 bg-sage text-white hover:bg-sage-dk rounded font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-sage/14" />
            <div className="text-xs text-ink-lt">OR</div>
            <div className="flex-1 h-px bg-sage/14" />
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-ink-lt">
            Don&apos;t have an account?{' '}
            <a href="/register" className="text-sage-lt hover:text-sage font-medium transition-colors">
              Sign up
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
