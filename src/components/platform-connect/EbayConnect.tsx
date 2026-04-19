'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { trackEvent } from '@/lib/plausible'
import { fetchApi } from '@/lib/api-utils'

interface EbayPolicy {
  id: string
  name: string
}

interface EbayPolicies {
  shipping?: EbayPolicy[]
  payment?: EbayPolicy[]
  returns?: EbayPolicy[]
  locations?: { merchantLocationKey?: string; key?: string }[]
}

interface EbayConnectionState {
  connected: boolean
  setupComplete: boolean
  username: string | null
  expiresAt: string | null
  isLoading: boolean
  error: string | null
  connectEbay: () => void
  disconnectEbay: () => void
}

interface EbayConnectProps {
  ebay: EbayConnectionState
  ebayPolicies: EbayPolicies | null
  ebayPoliciesLoading: boolean
  ebaySelectedPolicies: Record<string, string>
  ebayChangingPolicies: boolean
  ebaySetupMessage: string | null
  policyIsLoading: boolean
  onPolicyChange: (field: string, value: string) => void
  onSaveEbayPolicies: () => void
  onChangePoliciesClick: () => void
}

interface EbaySellerStats {
  orderStats: {
    orderCount: number
    totalRevenue: number
    totalFees: number
    totalNet: number
    currency: string
    periodDays: number
    avgFeePercent: number | null
  }
  trafficStats: Record<string, unknown> | null
  trafficError?: string
  fetchedAt: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function EbayConnect({
  ebay,
  ebayPolicies,
  ebayPoliciesLoading,
  ebaySelectedPolicies,
  ebayChangingPolicies,
  ebaySetupMessage,
  policyIsLoading,
  onPolicyChange,
  onSaveEbayPolicies,
  onChangePoliciesClick,
}: EbayConnectProps) {
  const [sellerStats, setSellerStats] = useState<EbaySellerStats | null>(null)
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<string | null>(null)
  const [statsRefreshing, setStatsRefreshing] = useState(false)

  const loadCachedStats = useCallback(async () => {
    try {
      const res = await fetchApi<{ stats: EbaySellerStats | null; updatedAt: string | null }>('/api/ebay/seller-stats')
      if (res.stats) setSellerStats(res.stats)
      if (res.updatedAt) setStatsUpdatedAt(res.updatedAt)
    } catch {
      // silently fail — stats are non-critical
    }
  }, [])

  const refreshStats = useCallback(async () => {
    setStatsRefreshing(true)
    try {
      const res = await fetchApi<{ stats: EbaySellerStats; updatedAt: string }>('/api/ebay/seller-stats', {
        method: 'POST',
      })
      if (res.stats) setSellerStats(res.stats)
      if (res.updatedAt) setStatsUpdatedAt(res.updatedAt)
    } catch {
      // silently fail
    } finally {
      setStatsRefreshing(false)
    }
  }, [])

  // Load cached stats when eBay is connected
  useEffect(() => {
    if (ebay.connected && ebay.setupComplete) {
      loadCachedStats()
    }
  }, [ebay.connected, ebay.setupComplete, loadCachedStats])

  const handleConnectEbay = () => {
    trackEvent('PlatformConnected', { platform: 'ebay' })
    ebay.connectEbay()
  }

  const isTokenExpiringWithin7Days = (): boolean => {
    if (!ebay.expiresAt) return false
    const expiresAt = new Date(ebay.expiresAt)
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    return expiresAt <= sevenDaysFromNow
  }

  const getExpiryDateFormatted = (): string => {
    if (!ebay.expiresAt) return ''
    const expiresAt = new Date(ebay.expiresAt)
    return expiresAt.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  if (!ebay.connected) {
    // State A: Not connected
    return (
      <div>
        <div className="mb-6">
          <h3 className="font-medium text-sm text-ink mb-2">Connect your eBay account</h3>
          <p className="text-xs text-ink-lt mb-4">Before you continue, make sure you have:</p>
          <div className="space-y-2 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-sm text-ink-lt mt-0.5" aria-hidden>◯</div>
              <div className="text-sm text-ink">Active eBay seller account</div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-sm text-ink-lt mt-0.5" aria-hidden>◯</div>
              <div className="text-sm text-ink">eBay Managed Payments enabled</div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-sm text-ink-lt mt-0.5" aria-hidden>◯</div>
              <div className="text-sm text-ink">At least one shipping policy set up in eBay</div>
            </div>
          </div>
          <a
            href="https://www.bizpolicy.ebay.co.uk/businesspolicy/policyoptin"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-sage hover:text-sage-dk transition underline"
          >
            Set up policies in eBay Seller Hub →
          </a>
        </div>

        <button
          onClick={handleConnectEbay}
          disabled={ebay.isLoading}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50 mb-4"
        >
          {ebay.isLoading ? 'Connecting...' : 'Connect eBay account →'}
        </button>

        <div className="text-xs text-ink-lt text-center">
          Wrenlist will create and manage listings on your behalf. Disconnect any time.
        </div>
      </div>
    )
  }

  if (ebay.setupComplete && !ebayChangingPolicies) {
    // State C: Connected + setup complete
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-shrink-0">
            <MarketplaceIcon platform="ebay" size="lg" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="font-medium text-sm text-ink flex items-center gap-1.5">eBay UK — Connected <CheckCircle2 size={15} className="text-green-600" /></div>
            </div>
            <div className="text-xs text-ink-lt">Account: {ebay.username}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-4 bg-cream-md rounded mb-4">
          <div>
            <div className="text-xs font-medium text-ink-lt mb-1">Account</div>
            <div className="text-sm text-ink font-mono">{ebay.username}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-ink-lt mb-1">Marketplace</div>
            <div className="text-sm text-ink">eBay UK (GB)</div>
          </div>
        </div>

        {/* Seller stats (30-day summary) */}
        {sellerStats?.orderStats && sellerStats.orderStats.orderCount > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-ink-lt uppercase tracking-wide">Last 30 days</div>
              <button
                onClick={refreshStats}
                disabled={statsRefreshing}
                className="flex items-center gap-1 text-[10px] text-sage hover:text-sage-dk transition disabled:opacity-50"
              >
                <RefreshCw size={10} className={statsRefreshing ? 'animate-spin' : ''} />
                {statsUpdatedAt ? timeAgo(statsUpdatedAt) : 'Refresh'}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-cream-md rounded px-3 py-2 text-center">
                <div className="text-lg font-mono font-semibold text-ink">{sellerStats.orderStats.orderCount}</div>
                <div className="text-[10px] text-ink-lt uppercase tracking-wide">Orders</div>
              </div>
              <div className="bg-cream-md rounded px-3 py-2 text-center">
                <div className="text-lg font-mono font-semibold text-ink">
                  {sellerStats.orderStats.currency === 'GBP' ? '£' : '$'}{sellerStats.orderStats.totalRevenue.toFixed(0)}
                </div>
                <div className="text-[10px] text-ink-lt uppercase tracking-wide">Revenue</div>
              </div>
              <div className="bg-cream-md rounded px-3 py-2 text-center">
                <div className="text-lg font-mono font-semibold text-ink">
                  {sellerStats.orderStats.currency === 'GBP' ? '£' : '$'}{sellerStats.orderStats.totalFees.toFixed(0)}
                </div>
                <div className="text-[10px] text-ink-lt uppercase tracking-wide">Fees</div>
              </div>
              <div className="bg-cream-md rounded px-3 py-2 text-center">
                <div className="text-lg font-mono font-semibold text-ink">
                  {sellerStats.orderStats.avgFeePercent != null ? `${sellerStats.orderStats.avgFeePercent}%` : '—'}
                </div>
                <div className="text-[10px] text-ink-lt uppercase tracking-wide">Fee %</div>
              </div>
            </div>
          </div>
        )}

        {/* No stats yet — show refresh button */}
        {ebay.setupComplete && !sellerStats && (
          <div className="mb-4">
            <button
              onClick={refreshStats}
              disabled={statsRefreshing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-sage border border-border rounded hover:bg-cream transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={statsRefreshing ? 'animate-spin' : ''} />
              {statsRefreshing ? 'Loading stats...' : 'Load seller stats'}
            </button>
          </div>
        )}

        {isTokenExpiringWithin7Days() && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber rounded mb-4">
            <div className="text-sm text-amber mt-0.5">⚠️</div>
            <div className="flex-1">
              <div className="text-sm text-amber font-medium">Your eBay connection expires on {getExpiryDateFormatted()}</div>
              <div className="text-xs text-amber-700 mt-1">Reconnect to avoid interruptions.</div>
            </div>
            <button
              onClick={handleConnectEbay}
              disabled={ebay.isLoading}
              className="text-xs text-amber underline underline-offset-2 hover:text-amber-900 transition disabled:opacity-50 flex-shrink-0"
            >
              Reconnect →
            </button>
          </div>
        )}

        <div className="flex items-start gap-3 p-3 border border-border rounded mb-4 text-xs text-ink-lt">
          <span className="text-sage mt-0.5">&#x2713;</span>
          <div>
            <div className="font-medium text-sm text-ink">Auto-sync enabled</div>
            <div className="mt-1">
              Wrenlist checks eBay for new sales every 15 minutes automatically (works on any device).
              When a sale is detected, the find is marked sold and any other marketplaces it&apos;s listed
              on are queued for automatic delisting.
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onChangePoliciesClick}
            className="flex-1 px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition"
          >
            Change policies
          </button>
          <button
            onClick={handleConnectEbay}
            disabled={ebay.isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition disabled:opacity-50"
          >
            ↻ Reconnect
          </button>
          <button
            onClick={ebay.disconnectEbay}
            disabled={ebay.isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium text-red border border-border rounded hover:bg-red hover:bg-opacity-5 transition disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      </div>
    )
  }

  // State B: Connected but setup incomplete (or changing policies)
  return (
    <div>
      <div className="mb-6 p-4 bg-cream-md rounded">
        <div className="text-xs font-medium text-ink-lt mb-3">Setup progress</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="text-sage">✓</div>
            <div className="text-ink">Step 1: Connected</div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="text-ink-lt">◯</div>
            <div className="text-ink">Step 2: Choose policies</div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="text-ink-lt">◯</div>
            <div className="text-ink">Step 3: Ready</div>
          </div>
        </div>
      </div>

      <h3 className="font-medium text-sm text-ink mb-2">Choose your listing policies</h3>
      <p className="text-xs text-ink-lt mb-4">These are pulled from your eBay account</p>

      {ebayPoliciesLoading ? (
        <div className="text-center py-6">
          <div className="text-sm text-ink-lt">Loading policies...</div>
        </div>
      ) : (
        <>
          {/* Shipping Policies */}
          {ebayPolicies?.shipping && ebayPolicies.shipping.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-ink-lt mb-3 uppercase tracking-wide">Shipping Policy</h4>
              <div className="space-y-2">
                {ebayPolicies.shipping.map((policy) => (
                  <label key={policy.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="shipping"
                      value={policy.id}
                      checked={ebaySelectedPolicies.shipping === policy.id}
                      onChange={(e) => onPolicyChange('shipping', e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-ink">{policy.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Payment Policies */}
          {ebayPolicies?.payment && ebayPolicies.payment.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-ink-lt mb-3 uppercase tracking-wide">Payment Policy</h4>
              <div className="space-y-2">
                {ebayPolicies.payment.map((policy) => (
                  <label key={policy.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      value={policy.id}
                      checked={ebaySelectedPolicies.payment === policy.id}
                      onChange={(e) => onPolicyChange('payment', e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-ink">{policy.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Returns Policies */}
          {ebayPolicies?.returns && ebayPolicies.returns.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-ink-lt mb-3 uppercase tracking-wide">Returns Policy</h4>
              <div className="space-y-2">
                {ebayPolicies.returns.map((policy) => (
                  <label key={policy.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="returns"
                      value={policy.id}
                      checked={ebaySelectedPolicies.returns === policy.id}
                      onChange={(e) => onPolicyChange('returns', e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-ink">{policy.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {ebaySetupMessage && (
            <div className="p-3 bg-green-50 border border-green rounded text-sm text-green mb-4">
              {ebaySetupMessage}
            </div>
          )}

          <button
            onClick={onSaveEbayPolicies}
            disabled={policyIsLoading || Object.keys(ebaySelectedPolicies).length === 0}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
          >
            {policyIsLoading ? 'Saving...' : 'Save settings →'}
          </button>
        </>
      )}
    </div>
  )
}
