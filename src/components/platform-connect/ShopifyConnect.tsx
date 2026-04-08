'use client'

import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { Badge } from '@/components/wren/Badge'

interface ShopifyConnectProps {
  shopifyConnected: boolean
  shopifyName: string | null
  shopifyDomain: string | null
  shopifyLoading: boolean
  shopifyError: string | null
  shopifyFormOpen: boolean
  shopifyFormData: { storeDomain: string }
  onFormDataChange: (data: { storeDomain: string }) => void
  onConnect: (e: React.FormEvent) => void
  onDisconnect: () => void
  onOpenForm: () => void
  onCloseForm: () => void
}

export function ShopifyConnect({
  shopifyConnected,
  shopifyName,
  shopifyDomain,
  shopifyLoading,
  shopifyError,
  shopifyFormOpen,
  shopifyFormData,
  onFormDataChange,
  onConnect,
  onDisconnect,
  onOpenForm,
  onCloseForm,
}: ShopifyConnectProps) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-shrink-0">
          <MarketplaceIcon platform="shopify" size="lg" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm text-ink">Shopify</div>
          <div className="text-xs text-ink-lt">Crosslist to your Shopify store</div>
        </div>
        <Badge status={shopifyConnected ? 'listed' : 'draft'} label={shopifyConnected ? 'connected' : 'not connected'} />
      </div>

      {shopifyError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-sm text-red-700">
          {shopifyError}
        </div>
      )}

      {shopifyConnected && shopifyName ? (
        <>
          <div className="flex items-center justify-between p-3 border border-border rounded mb-4">
            <div>
              <div className="text-xs font-medium text-ink-lt mb-1">Store</div>
              <div className="text-sm text-ink font-medium">{shopifyName}</div>
              <div className="text-xs text-ink-lt">{shopifyDomain}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2">
              <div className="text-xs text-ink-lt">Connected</div>
            </div>
            <button
              onClick={onDisconnect}
              disabled={shopifyLoading}
              className="px-4 py-2 text-sm font-medium text-red border border-border rounded hover:bg-red hover:bg-opacity-5 transition disabled:opacity-50"
            >
              {shopifyLoading ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-4 mb-4">
            <p className="text-sm text-ink">
              Connect your Shopify store. You must be logged into <strong>admin.shopify.com</strong> in your browser. The Wrenlist extension handles publishing automatically.
            </p>
          </div>

          {!shopifyFormOpen ? (
            <button
              onClick={onOpenForm}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition"
            >
              Connect Store
            </button>
          ) : (
            <form onSubmit={onConnect} className="space-y-3">
              <input
                type="text"
                placeholder="Store ID or domain (e.g., pyedpp-i5 or pyedpp-i5.myshopify.com)"
                value={shopifyFormData.storeDomain}
                onChange={(e) => onFormDataChange({ ...shopifyFormData, storeDomain: e.target.value })}
                className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={shopifyLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
                >
                  {shopifyLoading ? 'Connecting...' : 'Connect'}
                </button>
                <button
                  type="button"
                  onClick={onCloseForm}
                  className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
}
