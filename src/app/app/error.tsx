'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-center">
        <h1 className="text-2xl font-serif text-ink mb-2">Something went wrong</h1>
        <p className="text-ink-lt mb-6">{error.message}</p>
        <button
          onClick={() => reset()}
          className="px-6 py-2 bg-sage text-cream rounded hover:bg-sage-dk"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
