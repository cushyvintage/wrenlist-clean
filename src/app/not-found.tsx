/**
 * 404 Not Found page
 */

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-cream">
      <div className="text-center max-w-md">
        <div className="font-serif text-6xl font-medium text-ink mb-4">404</div>
        <h1 className="text-2xl font-serif font-medium text-ink mb-2">Page not found</h1>
        <p className="text-ink-lt mb-6">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-2 bg-sage text-cream rounded font-medium hover:bg-sage-dk transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
