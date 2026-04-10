'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/lib/api-utils'
import { Button } from '@/components/wren/Button'
import AIAutoFillSettings from '@/components/settings/AIAutoFillSettings'

type SettingsTab = 'account' | 'workspace' | 'integrations' | 'ai' | 'billing' | 'legal'

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
}

interface ProfileResponse {
  full_name?: string
  plan?: string
  stripe_customer_id?: string
  finds_this_month?: number
  business_name?: string
  phone?: string
  address?: string
}

interface AuthResponse {
  user?: {
    id: string
    email: string
    created_at: string
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')

  const [accountData, setAccountData] = useState<AccountData>({
    email: '',
    fullName: '',
    avatar: null,
  })
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [saveSuccessful, setSaveSuccessful] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Load profile + workspace data on mount (single fetch, populates both)
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        setIsLoadingProfile(true)
        const [profile, auth] = await Promise.all([
          fetchApi<ProfileResponse>('/api/profiles/me'),
          fetchApi<AuthResponse>('/api/auth/me'),
        ])

        setAccountData({
          email: auth.user?.email || '',
          fullName: profile.full_name || '',
          avatar: null,
        })
        setWorkspaceData({
          businessName: profile.business_name || '',
          phone: profile.phone || '',
          address: profile.address || '',
        })
      } catch (error) {
        console.error('Failed to load profile:', error)
        // Keep defaults on error
      } finally {
        setIsLoadingProfile(false)
        setIsLoadingWorkspace(false)
      }
    }

    loadProfileData()
  }, [])

  const handleSaveAccountChanges = async () => {
    try {
      setIsSaving(true)
      setSaveError(null)
      setSaveSuccessful(false)

      await fetchApi('/api/profiles/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: accountData.fullName }),
      })

      setSaveSuccessful(true)
      setTimeout(() => setSaveSuccessful(false), 3000)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save changes'
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const [workspaceData, setWorkspaceData] = useState<WorkspaceData>({
    businessName: '',
    phone: '',
    address: '',
  })
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true)
  const [workspaceSaveSuccess, setWorkspaceSaveSuccess] = useState(false)
  const [workspaceSaveError, setWorkspaceSaveError] = useState<string | null>(null)
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false)

  const [platforms, setPlatforms] = useState<PlatformConnection[]>([])
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(true)

  // Load real platform connection statuses from single endpoint
  useEffect(() => {
    const loadPlatforms = async () => {
      try {
        interface PlatformStatus {
          platforms: {
            vinted: { connected: boolean; username?: string | null }
            ebay: { connected: boolean; username?: string | null }
            shopify: { connected: boolean; shopName?: string | null }
            depop: { connected: boolean; username?: string | null }
            etsy: { connected: boolean; username?: string | null }
          }
        }
        const data = await fetchApi<PlatformStatus>('/api/platforms/status')
        const p = data.platforms

        setPlatforms([
          {
            platform: 'Vinted',
            status: p.vinted.connected ? 'connected' : 'not_connected',
            accountName: p.vinted.username || undefined,
          },
          {
            platform: 'eBay',
            status: p.ebay.connected ? 'connected' : 'not_connected',
            accountName: p.ebay.username || undefined,
          },
          {
            platform: 'Depop',
            status: p.depop.connected ? 'connected' : 'not_connected',
            accountName: p.depop.username || undefined,
          },
          {
            platform: 'Shopify',
            status: p.shopify.connected ? 'connected' : 'not_connected',
            accountName: p.shopify.shopName || undefined,
          },
          {
            platform: 'Etsy',
            status: p.etsy.connected ? 'connected' : 'not_connected',
            accountName: p.etsy.username || undefined,
          },
        ])
      } catch (error) {
        console.error('Failed to load platforms:', error)
      } finally {
        setIsLoadingPlatforms(false)
      }
    }
    loadPlatforms()
  }, [])

  const handleSaveWorkspaceChanges = async () => {
    try {
      setIsSavingWorkspace(true)
      setWorkspaceSaveError(null)
      setWorkspaceSaveSuccess(false)

      await fetchApi('/api/profiles/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: workspaceData.businessName,
          phone: workspaceData.phone,
          address: workspaceData.address,
        }),
      })

      setWorkspaceSaveSuccess(true)
      setTimeout(() => setWorkspaceSaveSuccess(false), 3000)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save changes'
      setWorkspaceSaveError(message)
    } finally {
      setIsSavingWorkspace(false)
    }
  }

  const handleDataExport = () => {
    window.location.href =
      'mailto:support@wrenlist.com?subject=GDPR%20Data%20Export%20Request&body=Please%20send%20me%20a%20copy%20of%20all%20data%20you%20hold%20for%20my%20account.'
  }

  const handleDeleteAccount = () => {
    const confirmed = confirm(
      'Deleting your account is permanent and cannot be undone. All your finds, listings, and data will be erased.\n\nWe process deletion requests manually to prevent mistakes. Click OK to open a pre-filled email to support.'
    )
    if (!confirmed) return
    window.location.href =
      'mailto:support@wrenlist.com?subject=Account%20Deletion%20Request&body=Please%20delete%20my%20account%20and%20all%20associated%20data.'
  }

  return (
    <div className="flex gap-8">
      {/* Sidebar Navigation */}
      <div className="w-48 flex-shrink-0">
        <nav className="space-y-2">
          {(['account', 'workspace', 'integrations', 'ai', 'billing', 'legal'] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => {
                  if (tab === 'billing') {
                    router.push('/billing')
                    return
                  }
                  setActiveTab(tab)
                }}
                className={`w-full text-left px-4 py-2.5 rounded-sm text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-sage text-cream'
                    : 'text-ink-lt hover:bg-cream-md'
                }`}
              >
                {tab === 'ai' ? 'AI' : tab.charAt(0).toUpperCase() + tab.slice(1)}
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

            {/* Success Banner */}
            {saveSuccessful && (
              <div className="flex gap-2 items-center px-4 py-3 bg-sage/10 border border-sage/40 rounded-sm">
                <span>✓</span>
                <p className="text-sm text-sage-dk">Changes saved</p>
              </div>
            )}

            {/* Error Banner */}
            {saveError && (
              <div className="flex gap-2 items-center px-4 py-3 bg-red/10 border border-red/40 rounded-sm">
                <span>✕</span>
                <p className="text-sm text-red">{saveError}</p>
              </div>
            )}

            {/* Email (read-only) */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-medium text-sage-dim">
                Email Address
              </label>
              <input
                type="email"
                value={accountData.email}
                placeholder={isLoadingProfile ? 'Loading...' : ''}
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
                disabled={isLoadingProfile}
                className="w-full px-3 py-2 bg-white border border-sage/22 rounded-sm text-ink text-sm outline-none focus:border-sage transition-colors disabled:bg-cream-md disabled:text-ink-lt"
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
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  title="Coming soon"
                  className="border-sage/22 bg-cream-md text-ink-lt"
                >
                  Upload photo
                </Button>
              </div>
            </div>

            {/* Save Changes */}
            <div className="border-t border-sage/14 pt-6">
              <Button
                variant="primary"
                onClick={handleSaveAccountChanges}
                disabled={isSaving || isLoadingProfile}
                loading={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save changes'}
              </Button>
            </div>

            {/* Change Password */}
            <div className="border-t border-sage/14 pt-6">
              <a
                href="/forgot-password"
                className="inline-block px-4 py-2 bg-cream-md border border-sage/22 text-ink-lt rounded-sm font-medium text-sm hover:bg-cream transition-colors"
              >
                Change password
              </a>
              <p className="text-xs text-sage-dim mt-2">
                You&apos;ll receive a password reset link via email
              </p>
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

            {/* Workspace Success Banner */}
            {workspaceSaveSuccess && (
              <div className="flex gap-2 items-center px-4 py-3 bg-sage/10 border border-sage/40 rounded-sm">
                <span>✓</span>
                <p className="text-sm text-sage-dk">Changes saved</p>
              </div>
            )}

            {/* Workspace Error Banner */}
            {workspaceSaveError && (
              <div className="flex gap-2 items-center px-4 py-3 bg-red/10 border border-red/40 rounded-sm">
                <span>✕</span>
                <p className="text-sm text-red">{workspaceSaveError}</p>
              </div>
            )}

            {/* Save Button */}
            <div className="border-t border-sage/14 pt-6">
              <Button
                variant="primary"
                onClick={handleSaveWorkspaceChanges}
                disabled={isSavingWorkspace || isLoadingWorkspace}
                loading={isSavingWorkspace}
              >
                {isSavingWorkspace ? 'Saving...' : 'Save changes'}
              </Button>
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

            {isLoadingPlatforms && (
              <p className="text-sm text-sage-dim">Loading connections…</p>
            )}

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
                        <p className="text-xs text-ink-lt">
                          Account:{' '}
                          <span className="font-mono text-ink">
                            {platform.accountName || '—'}
                          </span>
                        </p>
                      ) : (
                        <p className="text-xs text-sage-dim">
                          Not connected
                        </p>
                      )}
                    </div>

                    <div>
                      <Button
                        variant={platform.status === 'connected' ? 'ghost' : 'primary'}
                        size="sm"
                        onClick={() => router.push('/platform-connect')}
                        className={
                          platform.status === 'connected'
                            ? 'border-sage/22 bg-cream-md text-ink-lt hover:bg-cream'
                            : undefined
                        }
                      >
                        {platform.status === 'connected' ? 'Manage' : 'Connect'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-sage-dim">
              Connecting, disconnecting, and syncing are all handled on the{' '}
              <button
                type="button"
                onClick={() => router.push('/platform-connect')}
                className="underline hover:text-sage"
              >
                platform connections page
              </button>
              .
            </p>
          </div>
        )}

        {/* AI Auto-Fill Section */}
        {activeTab === 'ai' && (
          <AIAutoFillSettings />
        )}

        {/* Billing — navigates directly to /billing via sidebar click */}


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
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-left px-4 py-3 bg-cream-md rounded-sm text-sm font-medium text-ink hover:bg-cream transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-left px-4 py-3 bg-cream-md rounded-sm text-sm font-medium text-ink hover:bg-cream transition-colors"
              >
                Terms of Service
              </a>
              <Button
                variant="ghost"
                onClick={handleDataExport}
                className="w-full justify-start bg-cream-md text-ink hover:bg-cream"
              >
                Data Export (GDPR)
              </Button>
            </div>

            {/* Danger Zone */}
            <div className="border-t border-sage/14 pt-6">
              <h3 className="font-medium text-red text-sm mb-4">Danger Zone</h3>
              <Button variant="danger" onClick={handleDeleteAccount}>
                Delete Account
              </Button>
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
