'use client'

import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { Badge } from '@/components/wren/Badge'

interface DepopConnectProps {
  depopConnected: boolean
  depopLoading: boolean
  onCheckConnection: () => void
}

export function DepopConnect({ depopConnected, depopLoading, onCheckConnection }: DepopConnectProps) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-shrink-0">
          <MarketplaceIcon platform="depop" size="lg" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm text-ink">
              {depopConnected ? 'Depop — Connected' : 'Depop'}
            </div>
          </div>
          <div className="text-xs text-ink-lt">
            {depopLoading ? 'Checking login...' : depopConnected
              ? 'Crosslist your finds to Depop via REST API'
              : 'Log in to depop.com, then click Check connection'}
          </div>
        </div>
        <Badge status={depopConnected ? 'listed' : 'draft'} label={depopConnected ? 'connected' : 'not connected'} />
      </div>

      {!depopConnected && (
        <div className="flex gap-2">
          <a
            href="https://www.depop.com/login"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition"
          >
            Log in to Depop →
          </a>
          <button
            onClick={onCheckConnection}
            disabled={depopLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
          >
            {depopLoading ? 'Checking...' : 'Check connection'}
          </button>
        </div>
      )}

      {depopConnected && (
        <div className="text-xs text-ink-lt bg-cream-md rounded p-3">
          Depop uses cookie-based authentication. The extension reads your Depop session from the browser and posts listings via their REST API with presigned S3 image uploads.
        </div>
      )}
    </div>
  )
}
