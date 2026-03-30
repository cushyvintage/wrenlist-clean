'use client'

import { useState, useEffect } from 'react'

type SettingsTab = 'account' | 'workspace' | 'integrations' | 'billing' | 'legal'

interface AccountData {
  email: string
  fullName: string
  avatar: string | null
}

interface WorkspaceData {
  businessName: string
  phone: string
  address: string
}

interface PlatformConnection {
  platform: string
  status: 'connected' | 'not_connected' | 'error'
  accountName?: string
  lastSync?: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')

  useEffect(() => {
    document.title = 'Settings | Wrenlist'
  }, [])

  const [accountData, setAccountData] = useState<AccountData>({
    email: 'cushyvintage@example.com',
    fullName: 'Dominic Cushnan',
    avatar: null,
  })

  const [workspaceData, setWorkspaceData] = useState<WorkspaceData>({
    businessName: 'Cushy Vintage',
    phone: '+44 161 XXX XXXX',
    address: 'Manchester, UK',
  })

  const [platforms] = useState<PlatformConnection[]>([
    {
      platform: 'Vinted',
      status: 'connected',
      accountName: '@cushyvintage',
      lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      platform: 'eBay',
      status: 'connected',
      accountName: 'cushyvintage_uk',
      lastSync: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
      platform: 'Etsy',
      status: 'not_connected',
    },
    {
      platform: 'Shopify',
      status: 'not_connected',
    },
  ])

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    const now = new Date()
    const diffMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    )

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <div className="flex gap-8">
      {/* Sidebar Navigation */}
      <div className="w-48 flex-shrink-0">
        <nav className="space-y-2">
          {(['account', 'workspace', 'integrations', 'billing', 'legal'] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-4 py-2.5 rounded-sm text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-sage text-cream'
                    : 'text-ink-lt hover:bg-cream-md'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            )
          )}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-2xl">
        {/* Account Section */}
        {activeTab === 'account' && (
          <div className="space-y-8">
            <div>
              <h2 className="font-serif text-xl italic text-ink mb-1">Account</h2>
              <p className="text-sm text-ink-lt">
                Manage your profile and security settings
              </p>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-medium text-sage-dim">
                Email Address
              </label>
              <input
                type="email"
                value={accountData.email}
                disabled
                className="w-full px-3 py-2 bg-cream-md border border-sage/22 rounded-sm text-ink-lt text-sm outline-none"
              />
              <p className="text-xs text-sage-dim">
                Contact support to change your email
              </p>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-medium text-sage-dim">
                Full Name
              </label>
              <input
                type="text"
                value={accountData.fullName}
                onChange={(e) =>
                  setAccountData({ ...accountData, fullName: e.target.value })
                }
                className="w-full px-3 py-2 bg-white border border-sage/22 rounded-sm text-ink text-sm outline-none focus:border-sage transition-colors"
              />
            </div>

            {/* Avatar Upload */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-medium text-sage-dim">
                Avatar
              </label>
              <div className="flex gap-4 items-end">
                <div className="w-16 h-16 bg-sage-pale rounded-md flex items-center justify-center text-2xl border border-sage/22">
                  👤
                </div>
                <button className="px-3 py-2 bg-cream-md border border-sage/22 rounded-sm text-sm font-medium text-ink-lt hover:bg-cream transition-colors">
                  Upload photo
                </button>
              </div>
            </div>

            {/* Change Password */}
            <div className="border-t border-sage/14 pt-6">
              <button className="px-4 py-2 bg-sage text-cream rounded-sm font-medium text-sm hover:bg-sage-dk transition-colors">
                Change password
              </button>
            </div>
          </div>
        )}

        {/* Workspace Section */}
        {activeTab === 'workspace' && (
          <div className="space-y-8">
            <div>
              <h2 className="font-serif text-xl italic text-ink mb-1">Workspace</h2>
              <p className="text-sm text-ink-lt">
                Business details and contact information
              </p>
            </div>

            {/* Business Name */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-medium text-sage-dim">
                Business Name
              </label>
              <input
                type="text"
                value={workspaceData.businessName}
                onChange={(e) =>
                  setWorkspaceData({
                    ...workspaceData,
                    businessName: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-white border border-sage/22 rounded-sm text-ink text-sm outline-none focus:border-sage transition-colors"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-medium text-sage-dim">
                Phone
              </label>
              <input
                type="tel"
                value={workspaceData.phone}
                onChange={(e) =>
                  setWorkspaceData({ ...workspaceData, phone: e.target.value })
                }
                className="w-full px-3 py-2 bg-white border border-sage/22 rounded-sm text-ink text-sm outline-none focus:border-sage transition-colors"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-medium text-sage-dim">
                Address
              </label>
              <textarea
                value={workspaceData.address}
                onChange={(e) =>
                  setWorkspaceData({
                    ...workspaceData,
                    address: e.target.value,
                  })
                }
                rows={3}
                className="w-full px-3 py-2 bg-white border border-sage/22 rounded-sm text-ink text-sm outline-none focus:border-sage transition-colors resize-none"
              />
            </div>

            {/* Save Button */}
            <div className="border-t border-sage/14 pt-6">
              <button className="px-4 py-2 bg-sage text-cream rounded-sm font-medium text-sm hover:bg-sage-dk transition-colors">
                Save changes
              </button>
            </div>
          </div>
        )}

        {/* Integrations Section */}
        {activeTab === 'integrations' && (
          <div className="space-y-8">
            <div>
              <h2 className="font-serif text-xl italic text-ink mb-1">
                Platform Connections
              </h2>
              <p className="text-sm text-ink-lt">
                Connect and sync your marketplace accounts
              </p>
            </div>

            {/* Platform List */}
            <div className="space-y-4">
              {platforms.map((platform, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-sage/14 rounded-md p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-ink text-sm mb-1">
                        {platform.platform}
                      </h3>
                      {platform.status === 'connected' ? (
                        <div className="space-y-1 text-xs text-ink-lt">
                          <p>
                            Account:{' '}
                            <span className="font-mono text-ink">
                              {platform.accountName}
                            </span>
                          </p>
                          <p>
                            Last sync:{' '}
                            <span className="text-sage-dim">
                              {formatLastSync(platform.lastSync)}
                            </span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-sage-dim">
                          Not connected
                        </p>
                      )}
                    </div>

                    <div>
                      {platform.status === 'connected' ? (
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 text-xs bg-cream-md border border-sage/22 text-ink-lt hover:bg-cream rounded-sm transition-colors font-medium">
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <button className="px-3 py-1.5 text-xs bg-sage text-cream hover:bg-sage-dk rounded-sm transition-colors font-medium">
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Billing Section */}
        {activeTab === 'billing' && (
          <div className="space-y-8">
            <div>
              <h2 className="font-serif text-xl italic text-ink mb-1">Billing</h2>
              <p className="text-sm text-ink-lt">
                Manage your subscription and payment methods
              </p>
            </div>

            {/* Current Plan */}
            <div className="bg-sage-pale border border-sage rounded-md p-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-sage text-sm mb-1">
                    Forager Plan
                  </h3>
                  <p className="text-xs text-sage-dim">
                    Annual billing • Renews 15 Apr 2025
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-medium text-ink">£9.99/mo</p>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <h3 className="font-medium text-ink text-sm mb-4">
                Payment Methods
              </h3>
              <div className="bg-white border border-sage/14 rounded-md p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 bg-blue-100 rounded flex items-center justify-center text-lg">
                    💳
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">
                      Visa ending in 4242
                    </p>
                    <p className="text-xs text-ink-lt">Expires 12/25</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 text-xs bg-cream-md border border-sage/22 text-ink-lt hover:bg-cream rounded-sm transition-colors font-medium">
                  Edit
                </button>
              </div>
            </div>

            {/* Invoice History */}
            <div>
              <h3 className="font-medium text-ink text-sm mb-3">
                Invoice History
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-sage/14">
                  <span className="text-ink">Invoice #INV-2025-03</span>
                  <span className="font-mono text-ink-lt">£99.90</span>
                  <button className="text-sage-lt hover:text-sage text-xs font-medium underline">
                    Download
                  </button>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-sage/14">
                  <span className="text-ink">Invoice #INV-2024-12</span>
                  <span className="font-mono text-ink-lt">£99.90</span>
                  <button className="text-sage-lt hover:text-sage text-xs font-medium underline">
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legal Section */}
        {activeTab === 'legal' && (
          <div className="space-y-8">
            <div>
              <h2 className="font-serif text-xl italic text-ink mb-1">Legal</h2>
              <p className="text-sm text-ink-lt">
                Privacy, terms, and account management
              </p>
            </div>

            {/* Legal Links */}
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-cream-md rounded-sm text-sm font-medium text-ink hover:bg-cream transition-colors">
                Privacy Policy
              </button>
              <button className="w-full text-left px-4 py-3 bg-cream-md rounded-sm text-sm font-medium text-ink hover:bg-cream transition-colors">
                Terms of Service
              </button>
              <button className="w-full text-left px-4 py-3 bg-cream-md rounded-sm text-sm font-medium text-ink hover:bg-cream transition-colors">
                Data Export (GDPR)
              </button>
            </div>

            {/* Danger Zone */}
            <div className="border-t border-sage/14 pt-6">
              <h3 className="font-medium text-red text-sm mb-4">Danger Zone</h3>
              <button className="px-4 py-2 bg-red text-white rounded-sm font-medium text-sm hover:bg-red-dk transition-colors">
                Delete Account
              </button>
              <p className="text-xs text-ink-lt mt-2">
                This action cannot be undone. All your data will be permanently
                deleted.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
