'use client'

import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { Badge } from '@/components/wren/Badge'

interface FacebookConnectProps {
  facebookConnected: boolean
  facebookDetected: boolean
  facebookLoading: boolean
  onConnect: () => Promise<void>
  onDisconnect: () => Promise<void>
}

export function FacebookConnect({ facebookConnected, facebookDetected, facebookLoading, onConnect, onDisconnect }: FacebookConnectProps) {
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
            {facebookLoading
              ? 'Checking...'
              : facebookConnected
                ? 'Ready to post local pickup listings'
                : facebookDetected
                  ? 'We detected an active Facebook session in your browser. Click Connect to link it.'
                  : 'Log in to facebook.com, then click Check connection'}
          </div>
        </div>
        <Badge
          status={facebookConnected ? 'listed' : facebookDetected ? 'on_hold' : 'draft'}
          label={facebookConnected ? 'connected' : facebookDetected ? 'session detected' : 'not connected'}
        />
      </div>

      {!facebookConnected && !facebookDetected && (
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
            onClick={onConnect}
            disabled={facebookLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
          >
            {facebookLoading ? 'Checking...' : 'Check connection'}
          </button>
        </div>
      )}

      {!facebookConnected && facebookDetected && (
        <div className="flex gap-2">
          <button
            onClick={onConnect}
            disabled={facebookLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
          >
            {facebookLoading ? 'Connecting…' : 'Connect Facebook'}
          </button>
        </div>
      )}

      {facebookConnected && (
        <div className="space-y-3">
          <div className="text-xs text-ink-lt bg-cream-md rounded p-3">
            Facebook Marketplace in the UK is local pickup only — buyers collect from you. Wrenlist uses your existing Facebook login to post listings to Marketplace for you.
          </div>
          <div className="flex justify-end">
            <button
              onClick={onDisconnect}
              disabled={facebookLoading}
              className="px-3 py-1.5 text-xs font-medium text-red border border-border rounded hover:bg-red hover:bg-opacity-5 transition disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
