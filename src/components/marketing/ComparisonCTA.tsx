'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/plausible'

export function ComparisonCTA() {
  return (
    <Link
      href="/register"
      onClick={() => trackEvent('CTAClicked', { source: 'marketplace-comparison' })}
      className="inline-block bg-[#f5f0e8] text-[#3d5c3a] rounded font-medium px-8 py-3 hover:bg-[#ede8de] transition-colors"
    >
      Start Selling Free
    </Link>
  )
}
