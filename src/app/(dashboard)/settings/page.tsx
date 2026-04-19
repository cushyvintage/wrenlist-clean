'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchApi } from '@/lib/api-utils'
import { Button } from '@/components/wren/Button'
import { Modal } from '@/components/wren/Modal'
import { supabase } from '@/services/supabase'
import AIAutoFillSettings from '@/components/settings/AIAutoFillSettings'
import { useAuthContext } from '@/contexts/AuthContext'

type DeleteStep = 'confirm' | 'feedback' | 'processing' | 'done'

const DELETE_REASONS = [
  'Too expensive',
  'Not enough features',
  'Found a better tool',
  'Just testing it out',
  'Other',
] as const

type SettingsTab = 'account' | 'workspace' | 'integrations' | 'ai' | 'billing' | 'legal'

/** Center-crop to square + downscale to maxSize, output JPEG at given quality. */
async function resizeImageToJpeg(file: File, maxSize: number, quality: number): Promise<File> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Failed to decode image'))
    el.src = dataUrl
  })
  const side = Math.min(img.naturalWidth, img.naturalHeight)
  const sx = (img.naturalWidth - side) / 2
  const sy = (img.naturalHeight - side) / 2
  const target = Math.min(maxSize, side)
  const canvas = document.createElement('canvas')
  canvas.width = target
  canvas.height = target
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )
  if (!blob) throw new Error('Image encoding failed')
  return new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
}

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
  lastSync?: string | null
}

interface ProfileResponse {
  full_name?: string
  plan?: string
  stripe_customer_id?: string
  finds_this_month?: number
  business_name?: string
  phone?: string
  address?: string
  avatar_url?: string | null
}

interface AuthResponse {
  user?: {
    id: string
    email: string
    created_at: string
  }
}

const VALID_TABS = ['account', 'workspace', 'integrations', 'ai', 'billing', 'legal'] as const
function isValidTab(v: string | null): v is SettingsTab {
  return v !== null && (VALID_TABS as readonly string[]).includes(v)
}

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: authUser } = useAuthContext()
  // Deep-link via ?tab=integrations etc. Falls back to 'account' if the
  // param is missing or unknown. The tab buttons also mutate the URL so
  // copy/paste shares the current tab.
  const initialTab = isValidTab(searchParams.get('tab')) ? (searchParams.get('tab') as SettingsTab) : 'account'
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)

  // Keep state in sync with back/forward navigation
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (isValidTab(tab) && tab !== activeTab) setActiveTab(tab as SettingsTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // SSO-only users never had a Wrenlist password — "Change password" would
  // email them a reset link for an account they can't log in to with a
  // password, which is confusing. Show a clearer note instead.
  const providers = authUser?.providers ?? []
  const hasEmailProvider = providers.length === 0 || providers.includes('email')
  const ssoOnlyProvider =
    providers.length > 0 && !hasEmailProvider ? providers[0] : null

  const [accountData, setAccountData] = useState<AccountData>({
    email: '',
    fullName: '',
    avatar: null,
  })
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [saveSuccessful, setSaveSuccessful] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Delete-account modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('confirm')
  const [deleteReason, setDeleteReason] = useState<string>(DELETE_REASONS[0])
  const [deleteFeedback, setDeleteFeedback] = useState('')
  const [deleteAlternative, setDeleteAlternative] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
          avatar: profile.avatar_url || null,
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
      const { showError } = await import('@/lib/toast-error')
      showError(error, 'Failed to save changes')
      setSaveError('Failed to save changes')
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
        interface PlatformEntry {
          connected: boolean
          username?: string | null
          shopName?: string | null
          lastSync?: string | null
        }
        interface PlatformStatus {
          platforms: {
            vinted: PlatformEntry
            ebay: PlatformEntry
            shopify: PlatformEntry
            depop: PlatformEntry
            etsy: PlatformEntry
          }
        }
        const data = await fetchApi<PlatformStatus>('/api/platforms/status')
        const p = data.platforms

        setPlatforms([
          {
            platform: 'Vinted',
            status: p.vinted.connected ? 'connected' : 'not_connected',
            accountName: p.vinted.username || undefined,
            lastSync: p.vinted.lastSync,
          },
          {
            platform: 'eBay',
            status: p.ebay.connected ? 'connected' : 'not_connected',
            accountName: p.ebay.username || undefined,
            lastSync: p.ebay.lastSync,
          },
          {
            platform: 'Depop',
            status: p.depop.connected ? 'connected' : 'not_connected',
            accountName: p.depop.username || undefined,
            lastSync: p.depop.lastSync,
          },
          {
            platform: 'Shopify',
            status: p.shopify.connected ? 'connected' : 'not_connected',
            accountName: p.shopify.shopName || undefined,
            lastSync: p.shopify.lastSync,
          },
          {
            platform: 'Etsy',
            status: p.etsy.connected ? 'connected' : 'not_connected',
            accountName: p.etsy.username || undefined,
            lastSync: p.etsy.lastSync,
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
      const { showError } = await import('@/lib/toast-error')
      showError(error, 'Failed to save changes')
      setWorkspaceSaveError('Failed to save changes')
    } finally {
      setIsSavingWorkspace(false)
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Only JPEG, PNG, or WebP images allowed')
      return
    }
    // Guard against absurdly large originals (phone RAW/HEIC converts can be ~50MB)
    if (file.size > 20 * 1024 * 1024) {
      setAvatarError('Image must be under 20MB')
      return
    }

    setAvatarError(null)
    setIsUploadingAvatar(true)

    try {
      const uploadFile = await resizeImageToJpeg(file, 512, 0.85)
      const formData = new FormData()
      formData.append('file', uploadFile)
      const res = await fetch('/api/profiles/me/avatar', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Upload failed')
      }
      const body = (await res.json()) as { data: { avatar_url: string } }
      setAccountData((prev) => ({ ...prev, avatar: body.data.avatar_url }))
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const formatLastSync = (dateString?: string | null) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000)
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const handleDataExport = () => {
    window.location.href =
      'mailto:support@wrenlist.com?subject=GDPR%20Data%20Export%20Request&body=Please%20send%20me%20a%20copy%20of%20all%20data%20you%20hold%20for%20my%20account.'
  }

  const handleDeleteAccount = () => {
    // Reset modal state fresh each time and open
    setDeleteStep('confirm')
    setDeleteReason(DELETE_REASONS[0])
    setDeleteFeedback('')
    setDeleteAlternative('')
    setDeleteConfirmText('')
    setDeleteError(null)
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    // Don't let the user close the modal mid-delete
    if (deleteStep === 'processing') return
    setDeleteModalOpen(false)
  }

  const handleConfirmDelete = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm.')
      return
    }

    setDeleteError(null)
    setDeleteStep('processing')

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: deleteReason,
          feedback: deleteFeedback.trim() || null,
          alternativeTool: deleteAlternative.trim() || null,
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to delete account')
      }

      setDeleteStep('done')

      // Sign out the now-orphaned session, then redirect.
      // Small delay so the user sees the "deleted" confirmation message.
      setTimeout(async () => {
        try {
          await supabase.auth.signOut()
        } catch {}
        window.location.href = '/goodbye'
      }, 1500)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account')
      setDeleteStep('feedback')
    }
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
                  const params = new URLSearchParams(searchParams.toString())
                  params.set('tab', tab)
                  router.replace(`/settings?${params.toString()}`, { scroll: false })
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
                <div className="w-16 h-16 bg-sage-pale rounded-md flex items-center justify-center text-2xl border border-sage/22 overflow-hidden">
                  {accountData.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={accountData.avatar}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>👤</span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar || isLoadingProfile}
                  className="border-sage/22 bg-cream-md text-ink-lt hover:bg-cream"
                >
                  {isUploadingAvatar ? 'Uploading…' : 'Upload photo'}
                </Button>
              </div>
              {avatarError && (
                <p className="text-xs text-red mt-1">{avatarError}</p>
              )}
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

            {/* Change Password (hidden for SSO-only users — they don't have
                a Wrenlist password to change). */}
            <div className="border-t border-sage/14 pt-6">
              {hasEmailProvider ? (
                <>
                  <a
                    href="/forgot-password"
                    className="inline-block px-4 py-2 bg-cream-md border border-sage/22 text-ink-lt rounded-sm font-medium text-sm hover:bg-cream transition-colors"
                  >
                    Change password
                  </a>
                  <p className="text-xs text-sage-dim mt-2">
                    You&apos;ll receive a password reset link via email
                  </p>
                </>
              ) : (
                <p className="text-xs text-sage-dim">
                  You signed in with{' '}
                  <span className="capitalize">{ssoOnlyProvider ?? 'single sign-on'}</span>.
                  Manage your password with your provider.
                </p>
              )}
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
                        <div className="space-y-1 text-xs text-ink-lt">
                          <p>
                            Account:{' '}
                            <span className="font-mono text-ink">
                              {platform.accountName
                                ? /^\d+$/.test(platform.accountName)
                                  ? `User \u2116${platform.accountName}`
                                  : platform.accountName
                                : '—'}
                            </span>
                            {platform.accountName && /^\d+$/.test(platform.accountName) && platform.platform === 'Vinted' && (
                              <span className="ml-1 text-[10px] text-sage-dim">
                                (Vinted hides public usernames from its API)
                              </span>
                            )}
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

      {/* Delete account modal */}
      <Modal
        open={deleteModalOpen}
        onClose={closeDeleteModal}
        title={
          deleteStep === 'confirm'
            ? 'Delete your account?'
            : deleteStep === 'feedback'
              ? 'Before you go…'
              : deleteStep === 'processing'
                ? 'Deleting your account'
                : 'Account deleted'
        }
      >
        {deleteStep === 'confirm' && (
          <div className="space-y-4">
            <p className="text-sm text-ink leading-relaxed">
              This will permanently remove everything tied to your Wrenlist account:
            </p>
            <ul className="text-sm text-ink-lt space-y-1 list-disc list-inside">
              <li>All your finds, listings and photos</li>
              <li>Expenses, mileage and sourcing trips</li>
              <li>Marketplace connections (eBay, Vinted, Etsy, Depop, Shopify)</li>
              <li>Any active subscription will be cancelled immediately</li>
            </ul>
            <p className="text-sm text-ink leading-relaxed">
              This cannot be undone. <strong>Are you sure you want to continue?</strong>
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={closeDeleteModal} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => setDeleteStep('feedback')}
                className="flex-1"
              >
                Yes, continue
              </Button>
            </div>
          </div>
        )}

        {deleteStep === 'feedback' && (
          <div className="space-y-4">
            <p className="text-sm text-ink-lt leading-relaxed">
              Before you go — if you have a minute, I&apos;d really like to know why. This
              goes straight to me (Dom, the founder).
            </p>

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {deleteError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                Reason for leaving
              </label>
              <select
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 bg-cream-md border border-sage/20 rounded text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage"
              >
                {DELETE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                Anything I could have done better?
              </label>
              <textarea
                value={deleteFeedback}
                onChange={(e) => setDeleteFeedback(e.target.value)}
                placeholder="Pricing, missing features, a bug, something the onboarding didn't make clear…"
                rows={4}
                maxLength={2000}
                className="w-full px-3 py-2 bg-cream-md border border-sage/20 rounded text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                What are you using instead? <span className="text-ink-lt/60 normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={deleteAlternative}
                onChange={(e) => setDeleteAlternative(e.target.value)}
                placeholder="e.g. List Perfectly, Vendoo, or nothing"
                maxLength={200}
                className="w-full px-3 py-2 bg-cream-md border border-sage/20 rounded text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>

            <div className="pt-2 border-t border-sage/14">
              <label className="block text-xs font-medium text-red mb-2 uppercase tracking-wide">
                Type DELETE to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                autoCapitalize="characters"
                className="w-full px-3 py-2 bg-cream-md border border-red/30 rounded text-sm text-ink focus:outline-none focus:ring-2 focus:ring-red"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={closeDeleteModal} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                className="flex-1"
              >
                Delete my account
              </Button>
            </div>
          </div>
        )}

        {deleteStep === 'processing' && (
          <div className="py-8 text-center">
            <div className="inline-block w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-ink-lt">Deleting your account…</p>
          </div>
        )}

        {deleteStep === 'done' && (
          <div className="py-8 text-center">
            <div className="w-12 h-12 bg-sage-pale rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12l5 5 9-9"
                  stroke="var(--sage)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-sm text-ink mb-1">Your account has been deleted.</p>
            <p className="text-xs text-ink-lt">Redirecting…</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
