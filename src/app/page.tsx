'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

function HomeRedirect() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (isLoading) return

    // Preserve query string (?ref=… and ?waitlist=…) when redirecting to /landing
    // so the landing page can react to it (auto-open waitlist modal, capture referral).
    const qs = searchParams.toString()
    const suffix = qs ? `?${qs}` : ''

    if (user) {
      router.push('/dashboard')
    } else {
      router.push(`/landing${suffix}`)
    }
  }, [user, isLoading, router, searchParams])

  return null
}

function LoadingShell() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Wrenlist</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

export default function Home() {
  // useSearchParams must be wrapped in Suspense so Next can statically
  // generate this page's shell while bailing out of CSR for the redirect.
  return (
    <Suspense fallback={<LoadingShell />}>
      <HomeRedirect />
      <LoadingShell />
    </Suspense>
  )
}
