'use client'

import { CheckCircle2 } from 'lucide-react'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { VintedDebugPanel } from '@/components/wren/VintedDebugPanel'

interface VintedConnectProps {
  vintedConnected: boolean
  vintedUsername: string | null
  vintedLoading: boolean
  vintedSyncLoading: boolean
  vintedSyncResult: { updated: number; failed: number } | null
  vintedActionError: string | null
  extensionDetected: boolean | null
  isMobileOrNonChrome: boolean
  showDebug: boolean
  salesDetection: Record<string, boolean>
  onSalesDetectionToggle: () => void
  onVintedSync: () => void
  onDisconnect: () => void
}

export function VintedConnect({
  vintedConnected,
  vintedUsername,
  vintedLoading,
  vintedSyncLoading,
  vintedSyncResult,
  vintedActionError,
  extensionDetected,
  isMobileOrNonChrome,
  showDebug,
  salesDetection,
  onSalesDetectionToggle,
  onVintedSync,
  onDisconnect,
}: VintedConnectProps) {
  if (!vintedConnected && !extensionDetected) {
    // State A: Not connected (no extension)
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-shrink-0">
            <MarketplaceIcon platform="vinted" size="lg" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-ink">Vinted</div>
            <div className="text-xs text-ink-lt">Automatic via extension</div>
          </div>
        </div>

        <p className="text-sm text-ink mb-4">
          Vinted connects automatically via the Wrenlist extension. Simply log in to <strong>vinted.co.uk</strong> in your browser and Wrenlist will detect your account.
        </p>

        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber rounded mb-4">
          <div className="text-sm text-amber">⚠</div>
          <div className="text-sm text-amber">
            <strong>Heads up about Vinted&apos;s Terms of Service</strong> — Vinted&apos;s ToS prohibit third-party automation tools.{' '}
            <a href="https://www.vinted.co.uk/terms-and-conditions" className="underline hover:no-underline">
              Read Vinted&apos;s terms →
            </a>
          </div>
        </div>

        <p className="text-xs text-ink-lt text-center">
          {vintedLoading || extensionDetected === null
            ? 'Checking status...'
            : extensionDetected
              ? 'Extension detected ✓'
              : isMobileOrNonChrome
                ? 'Extension offline — open Chrome on your desktop to connect'
                : 'Extension not detected. Install it to continue.'}
        </p>
      </div>
    )
  }

  // State B: Connected
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-shrink-0">
          <MarketplaceIcon platform="vinted" size="lg" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm text-ink flex items-center gap-1.5">Vinted — Connected <CheckCircle2 size={15} className="text-green-600" /></div>
          </div>
          <div className="text-xs text-ink-lt">Account: {vintedUsername}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 bg-cream-md rounded mb-4">
        <div>
          <div className="text-xs font-medium text-ink-lt mb-1">Username</div>
          <div className="text-sm text-ink font-mono">{vintedUsername}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-ink-lt mb-1">Platform</div>
          <div className="text-sm text-ink">Vinted UK</div>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 border border-border rounded mb-4">
        <div>
          <div className="font-medium text-sm text-ink">Sale detection</div>
          <div className="text-xs text-ink-lt mt-1">Auto-mark finds as sold when Vinted reports a sale</div>
        </div>
        <button
          onClick={onSalesDetectionToggle}
          className={`relative w-10 h-6 rounded-full transition ${
            salesDetection.vinted ? 'bg-sage' : 'bg-gray-300'
          }`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${
              salesDetection.vinted ? 'right-0.5' : 'left-0.5'
            }`}
          ></div>
        </button>
      </div>

      {vintedActionError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-sm text-red-700">
          {vintedActionError}
        </div>
      )}

      {vintedSyncResult && (
        <div className="bg-green-50 border border-green-200 rounded p-3 mb-4 text-sm text-green-700">
          Synced status: {vintedSyncResult.updated} item{vintedSyncResult.updated !== 1 ? 's' : ''} updated
          {vintedSyncResult.failed > 0 && `, ${vintedSyncResult.failed} failed`}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <a
          href="/import?platform=vinted"
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition text-center"
        >
          Import listings →
        </a>
        <button
          onClick={onVintedSync}
          disabled={vintedSyncLoading}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
        >
          {vintedSyncLoading ? 'Syncing...' : 'Sync status'}
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2">
          <div className="text-xs text-ink-lt">Managed by Wrenlist extension</div>
        </div>
        <button
          onClick={onDisconnect}
          disabled={vintedLoading}
          className="px-4 py-2 text-sm font-medium text-red border border-border rounded hover:bg-red hover:bg-opacity-5 transition disabled:opacity-50"
        >
          {vintedLoading ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>

      {showDebug && <VintedDebugPanel extensionId="nblnainobllgbjkdkpeodjpopkgnpfgb" />}
    </div>
  )
}
