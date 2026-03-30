'use client'

import { useState } from 'react'
import { Panel } from '@/components/wren/Panel'
import { InsightCard } from '@/components/wren/InsightCard'
import { Badge } from '@/components/wren/Badge'

interface PlatformConnection {
  id: string
  name: string
  icon: string
  status: 'connected' | 'pending' | 'disconnected'
  account?: string
  email?: string
  listings?: number
  lastSync?: string
  salesDetection?: boolean
}

const mockPlatforms: PlatformConnection[] = [
  {
    id: 'extension',
    name: 'Wrenlist Extension',
    icon: '📦',
    status: 'connected',
    lastSync: '2 minutes ago',
  },
  {
    id: 'ebay',
    name: 'eBay UK',
    icon: '🛒',
    status: 'connected',
    account: 'jordan_thrifts',
    email: 'jordan@example.com',
    listings: 147,
    lastSync: '2 minutes ago',
    salesDetection: true,
  },
  {
    id: 'vinted',
    name: 'Vinted',
    icon: '👚',
    status: 'connected',
    account: '@jordanthrifts',
    email: 'jordan@example.com',
    listings: 83,
    lastSync: '5 minutes ago',
    salesDetection: true,
  },
  {
    id: 'etsy',
    name: 'Etsy',
    icon: '🎨',
    status: 'pending',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    icon: '🏪',
    status: 'disconnected',
  },
]

export default function PlatformConnectPage() {
  const [platforms, setPlatforms] = useState(mockPlatforms)
  const [salesDetection, setSalesDetection] = useState<Record<string, boolean>>({
    ebay: true,
    vinted: true,
  })

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-lg font-serif text-ink">platform connections</h1>
        <a href="/app/settings" className="text-sm text-sage hover:text-sage-dk transition">
          ← back to settings
        </a>
      </div>

      {/* Extension banner */}
      <div className="flex items-center gap-4 p-4 bg-sage-pale border border-sage rounded">
        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 bg-white rounded border border-border">
          📦
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-ink">Wrenlist Extension</span>
            <div className="flex items-center gap-1 text-xs font-semibold text-sage uppercase tracking-wide">
              <div className="w-1 h-1 rounded-full bg-sage"></div>
              connected
            </div>
          </div>
          <div className="text-xs text-ink-lt">Chrome · v2.1.4 · Required for Vinted and Shopify crosslisting</div>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition flex-shrink-0">
          Extension settings →
        </button>
      </div>

      {/* eBay */}
      <Panel>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-11 h-11 flex items-center justify-center text-2xl flex-shrink-0 rounded bg-orange-100">
            🛒
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-ink">eBay UK</div>
            <div className="text-xs text-ink-lt">147 active listings synced</div>
          </div>
          <Badge status="listed">connected</Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 p-4 bg-cream-md rounded mb-4">
          <div>
            <div className="text-xs font-medium text-ink-lt mb-1">Account</div>
            <div className="text-sm text-ink font-mono">jordan_thrifts</div>
          </div>
          <div>
            <div className="text-xs font-medium text-ink-lt mb-1">Email</div>
            <div className="text-sm text-ink font-mono">jordan@example.com</div>
          </div>
          <div>
            <div className="text-xs font-medium text-ink-lt mb-1">Synced</div>
            <div className="text-sm text-ink">2 minutes ago</div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 border border-border rounded mb-4">
          <div>
            <div className="font-medium text-sm text-ink">Sale detection</div>
            <div className="text-xs text-ink-lt mt-1">Auto-mark finds as sold when eBay reports a sale</div>
          </div>
          <button
            onClick={() => setSalesDetection({ ...salesDetection, ebay: !salesDetection.ebay })}
            className={`relative w-10 h-6 rounded-full transition ${
              salesDetection.ebay ? 'bg-sage' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${
                salesDetection.ebay ? 'right-0.5' : 'left-0.5'
              }`}
            ></div>
          </button>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition">
            ↻ Reconnect
          </button>
          <button className="flex-1 px-4 py-2 text-sm font-medium text-red border border-border rounded hover:bg-red hover:bg-opacity-5 transition">
            Disconnect
          </button>
        </div>
      </Panel>

      {/* Vinted */}
      <Panel>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-11 h-11 flex items-center justify-center text-2xl flex-shrink-0 rounded bg-green-100">
            👚
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-ink">Vinted</div>
            <div className="text-xs text-ink-lt">83 active listings synced</div>
          </div>
          <Badge status="listed">connected</Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 p-4 bg-cream-md rounded mb-4">
          <div>
            <div className="text-xs font-medium text-ink-lt mb-1">Account</div>
            <div className="text-sm text-ink font-mono">@jordanthrifts</div>
          </div>
          <div>
            <div className="text-xs font-medium text-ink-lt mb-1">Email</div>
            <div className="text-sm text-ink font-mono">jordan@example.com</div>
          </div>
          <div>
            <div className="text-xs font-medium text-ink-lt mb-1">Synced</div>
            <div className="text-sm text-ink">5 minutes ago</div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 border border-border rounded mb-4">
          <div>
            <div className="font-medium text-sm text-ink">Sale detection</div>
            <div className="text-xs text-ink-lt mt-1">Auto-mark finds as sold when Vinted reports a sale</div>
          </div>
          <button
            onClick={() => setSalesDetection({ ...salesDetection, vinted: !salesDetection.vinted })}
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

        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber rounded mb-4">
          <div className="text-sm text-amber">⚠</div>
          <div className="text-sm text-amber">
            <strong>Heads up about Vinted's Terms of Service</strong> — Vinted's ToS prohibit third-party automation tools.{' '}
            <a href="https://www.vinted.co.uk/terms-and-conditions" className="underline hover:no-underline">
              Read Vinted's terms →
            </a>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2">
            <div className="text-xs text-ink-lt">Managed by Wrenlist extension</div>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-red border border-border rounded hover:bg-red hover:bg-opacity-5 transition">
            Disconnect
          </button>
        </div>
      </Panel>

      {/* Etsy - Pending */}
      <Panel>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 flex items-center justify-center text-2xl flex-shrink-0 rounded bg-amber-100 opacity-70">
            🎨
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="font-medium text-sm text-ink">Etsy</div>
              <span className="px-2 py-1 text-xs font-semibold text-amber bg-amber-50 rounded">
                API pending
              </span>
            </div>
            <div className="text-xs text-ink-lt">
              We're awaiting Etsy API key approval — the application is in.
            </div>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition flex-shrink-0">
            View roadmap →
          </button>
        </div>
      </Panel>

      {/* Shopify - Disconnected */}
      <Panel>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-11 h-11 flex items-center justify-center text-2xl flex-shrink-0 rounded bg-green-50">
            🏪
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-ink">Shopify</div>
            <div className="text-xs text-ink-lt">Crosslist to your Shopify store. Requires Wrenlist extension.</div>
          </div>
          <Badge status="hold">not connected</Badge>
        </div>

        <div className="flex items-center gap-3 p-3 bg-cream-md rounded mb-4">
          <div className="text-xs text-sage-dim">📦</div>
          <div className="flex-1">
            <div className="font-medium text-xs text-ink">Extension ready</div>
            <div className="text-xs text-ink-lt">Wrenlist extension is installed. Enter your Shopify store URL to connect.</div>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition flex-shrink-0">
            Connect →
          </button>
        </div>
      </Panel>

      {/* Tip */}
      <InsightCard
        title="tip"
        text="Connect Etsy to reach buyers looking specifically for vintage — your Laura Ashley and Pendleton pieces would perform significantly better there."
      />
    </div>
  )
}
