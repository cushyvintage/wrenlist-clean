'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/services/supabase'

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Auto-trigger Google sign-in when redirected from marketing domain
  useEffect(() => {
    if (searchParams.get('google') === '1') {
      handleGoogleSignIn()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Basic validation
    if (!email || !password) {
      setError('Please enter your email and password')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to log in')
      }

      // Redirect to app subdomain if on marketing domain
      const currentHost = typeof window !== 'undefined' ? window.location.host : ''
      if (currentHost === 'wrenlist.com' || currentHost === 'www.wrenlist.com') {
        window.location.href = 'https://app.wrenlist.com/dashboard'
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setIsLoading(true)

    try {
      // If on marketing domain, redirect to app subdomain to initiate OAuth
      // This ensures the PKCE cookie is set on app.wrenlist.com where the callback lives
      if (typeof window !== 'undefined' && window.location.hostname === 'wrenlist.com') {
        window.location.href = 'https://app.wrenlist.com/login?google=1'
        return
      }

      const callbackUrl = `${window.location.origin}/auth/callback`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google')
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

          {/* Google Sign-in Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full mb-4 px-4 py-2.5 border border-sage/14 rounded font-medium text-ink hover:bg-cream transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#4285F4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>

          {/* Divider */}
          <div className="my-4 flex items-center gap-4">
            <div className="flex-1 h-px bg-sage/14" />
            <div className="text-xs text-ink-lt">or sign in with email</div>
            <div className="flex-1 h-px bg-sage/14" />
          </div>

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
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium">
                  Password
                </label>
                <a href="/forgot-password" className="text-xs text-sage-lt hover:text-sage transition-colors">
                  Forgot?
                </a>
              </div>
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}
