'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function Home() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (user) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }, [user, isLoading, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Wrenlist</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
