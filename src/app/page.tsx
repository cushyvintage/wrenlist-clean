'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function Home() {
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

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Wrenlist</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
