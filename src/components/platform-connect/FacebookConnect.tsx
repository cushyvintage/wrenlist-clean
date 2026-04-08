'use client'

import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { Badge } from '@/components/wren/Badge'

interface FacebookConnectProps {
  facebookConnected: boolean
  facebookLoading: boolean
  onCheckConnection: () => void
}

export function FacebookConnect({ facebookConnected, facebookLoading, onCheckConnection }: FacebookConnectProps) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-shrink-0">
          <MarketplaceIcon platform="facebook" size="lg" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm text-ink">
              {facebookConnected ? 'Facebook Marketplace — Connected' : 'Facebook Marketplace'}
            </div>
          </div>
          <div className="text-xs text-ink-lt">
            {facebookLoading ? 'Checking login...' : facebookConnected
              ? 'Local pickup listings via browser automation'
              : 'Log in to facebook.com, then click Check connection'}
          </div>
        </div>
        <Badge status={facebookConnected ? 'listed' : 'draft'} label={facebookConnected ? 'connected' : 'not connected'} />
      </div>

      {!facebookConnected && (
        <div className="flex gap-2">
          <a
            href="https://www.facebook.com/marketplace"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition"
          >
            Log in to Facebook →
          </a>
          <button
            onClick={onCheckConnection}
            disabled={facebookLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
          >
            {facebookLoading ? 'Checking...' : 'Check connection'}
          </button>
        </div>
      )}

      {facebookConnected && (
        <div className="text-xs text-ink-lt bg-cream-md rounded p-3">
          Facebook Marketplace UK uses local pickup only. The extension scrapes session tokens from facebook.com and posts listings via their internal GraphQL API.
        </div>
      )}
    </div>
  )
}
