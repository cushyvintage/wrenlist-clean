'use client'

/**
 * App-level error page
 * Caught by error boundary in app layout
 */

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-cream">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-serif font-medium text-ink mb-2">Something went wrong</h1>
        <p className="text-ink-lt mb-6">
          An error occurred. Try refreshing the page or contact support if the problem persists.
        </p>
        <button
          onClick={reset}
          className="inline-block px-6 py-2 bg-sage text-cream rounded font-medium hover:bg-sage-dk transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
