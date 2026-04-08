'use client'

import { CheckCircle2 } from 'lucide-react'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { Badge } from '@/components/wren/Badge'

interface EtsyConnectProps {
  etsyConnected: boolean
  etsyLoading: boolean
  onCheckConnection: () => void
}

export function EtsyConnect({ etsyConnected, etsyLoading, onCheckConnection }: EtsyConnectProps) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-shrink-0">
          <MarketplaceIcon platform="etsy" size="lg" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm text-ink">
              {etsyConnected ? <span className="flex items-center gap-1.5">Etsy — Connected <CheckCircle2 size={15} className="text-green-600" /></span> : 'Etsy'}
            </div>
          </div>
          <div className="text-xs text-ink-lt">
            {etsyLoading ? 'Checking login...' : etsyConnected
              ? 'Crosslist your finds to Etsy via browser automation'
              : 'Log in to etsy.com, then click Check connection'}
          </div>
        </div>
        <Badge status={etsyConnected ? 'listed' : 'draft'} label={etsyConnected ? 'connected' : 'not connected'} />
      </div>

      {!etsyConnected && (
        <div className="flex gap-2">
          <a
            href="https://www.etsy.com/signin"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition"
          >
            Log in to Etsy →
          </a>
          <button
            onClick={onCheckConnection}
            disabled={etsyLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
          >
            {etsyLoading ? 'Checking...' : 'Check connection'}
          </button>
        </div>
      )}

      {etsyConnected && (
        <div className="text-xs text-ink-lt bg-cream-md rounded p-3">
          Etsy crosslisting uses browser automation — the extension opens the Etsy listing form, fills all fields, uploads images, selects the category, and clicks Publish. No API key needed.
        </div>
      )}
    </div>
  )
}
