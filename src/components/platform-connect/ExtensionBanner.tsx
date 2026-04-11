'use client'

/**
 * Extension status banner — shows whether the Wrenlist Chrome extension
 * is connected (desktop) or running remotely (mobile via heartbeat).
 *
 * States:
 *  - null:  "checking…" (loading, amber pulse dot)
 *  - true:  "connected" on desktop, "running on desktop" on mobile (green)
 *  - false: "not detected" on desktop, "offline" on mobile (amber, not red —
 *           the extension physically can't run on a phone, so red "NOT DETECTED"
 *           would be misleading)
 */
interface ExtensionBannerProps {
  extensionDetected: boolean | null
  extensionVersion: string | null
  /** True when detected but version < MIN_EXTENSION_VERSION — show upgrade nudge */
  isOutdated?: boolean
  isMobileOrNonChrome: boolean
  heartbeatLastSeenAt: string | null
}

export function ExtensionBanner({
  extensionDetected,
  extensionVersion,
  isOutdated = false,
  isMobileOrNonChrome,
  heartbeatLastSeenAt,
}: ExtensionBannerProps) {
  // Outdated takes precedence over "connected" — users need to act.
  const showOutdated = extensionDetected === true && isOutdated
  const borderClass = showOutdated
    ? 'bg-amber-50 border-amber/30'
    : extensionDetected
      ? 'bg-sage-pale border-sage'
      : extensionDetected === null
        ? 'bg-cream border-border'
        : 'bg-amber-50 border-amber/30'
  return (
    <div className={`flex items-center gap-4 p-4 rounded border ${borderClass}`}>
      <div className="flex-shrink-0">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Wrenlist Extension">
          <rect width="24" height="24" rx="6" fill="#5E7D5E" />
          <path d="M8 8V7C8 5.3 9.3 4 11 4H13C14.7 4 16 5.3 16 7V8M6 8H18L17 20H7L6 8Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-ink">Wrenlist Extension</span>
          {extensionDetected === null ? (
            <div className="flex items-center gap-1 text-xs font-semibold text-ink-lt uppercase tracking-wide">
              <div className="w-1 h-1 rounded-full bg-ink-lt animate-pulse"></div>
              checking…
            </div>
          ) : showOutdated ? (
            <div className="flex items-center gap-1 text-xs font-semibold text-amber-700 uppercase tracking-wide">
              <div className="w-1 h-1 rounded-full bg-amber-700"></div>
              update required
            </div>
          ) : extensionDetected ? (
            <div className="flex items-center gap-1 text-xs font-semibold text-sage uppercase tracking-wide">
              <div className="w-1 h-1 rounded-full bg-sage"></div>
              {isMobileOrNonChrome ? 'running on desktop' : 'connected'}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs font-semibold text-amber-700 uppercase tracking-wide">
              <div className="w-1 h-1 rounded-full bg-amber-700"></div>
              {isMobileOrNonChrome ? 'offline' : 'not detected'}
            </div>
          )}
        </div>
        <div className="text-xs text-ink-lt">
          {showOutdated
            ? `v${extensionVersion} is out of date — restart Chrome to auto-update, or reinstall from the Web Store`
            : extensionDetected && isMobileOrNonChrome && heartbeatLastSeenAt
              ? `Last seen ${new Date(heartbeatLastSeenAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
              : `Chrome desktop${extensionVersion ? ` · v${extensionVersion}` : ''} · Required for Vinted and Shopify crosslisting`
          }
        </div>
      </div>
      <span className="px-4 py-2 text-sm text-ink-lt flex-shrink-0 hidden sm:block">
        {isMobileOrNonChrome
          ? extensionDetected
            ? 'Manage from Chrome on your desktop'
            : 'Install in Chrome on your desktop'
          : 'Open extension from your browser toolbar'
        }
      </span>
    </div>
  )
}
