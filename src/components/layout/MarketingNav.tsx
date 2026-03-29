/**
 * MarketingNav Component
 * Top navigation bar for marketing pages (landing, pricing, why)
 *
 * Design: transparent bg with cream text, sticky positioning
 * Contains: logo, nav links (home, pricing, why), and CTA buttons (log in, start free)
 * Used in marketing pages to provide consistent top navigation
 *
 * @example
 * <MarketingNav
 *   onNavClick={(section) => { navigate to section }}
 *   onLoginClick={() => { navigate to login }}
 * />
 */

interface MarketingNavProps {
  /** Callback when nav item is clicked */
  onNavClick?: (section: 'home' | 'pricing' | 'why') => void
  /** Callback for login button */
  onLoginClick?: () => void
  /** Callback for "Start free" button */
  onStartClick?: () => void
  /** Current active section */
  activeSection?: 'home' | 'pricing' | 'why'
  /** Optional custom className */
  className?: string
}

export function MarketingNav({
  onNavClick,
  onLoginClick,
  onStartClick,
  activeSection = 'home',
  className = '',
}: MarketingNavProps) {
  const navItems = [
    { id: 'home' as const, label: 'home' },
    { id: 'pricing' as const, label: 'pricing' },
    { id: 'why' as const, label: 'why wrenlist' },
  ]

  return (
    <nav
      className={`sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-sage/14 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="text-2xl font-serif text-ink font-medium">Wrenlist</div>
          <div className="text-xs uppercase tracking-widest text-sage-dim font-medium">
            Thrifter&apos;s OS
          </div>
        </div>

        {/* Center nav links */}
        <div className="flex gap-8 items-center">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavClick?.(item.id)}
              className={`text-sm uppercase tracking-wide transition-colors ${
                activeSection === item.id
                  ? 'text-sage font-medium'
                  : 'text-ink-lt hover:text-sage'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Right side: CTA buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onLoginClick}
            className="text-sm uppercase tracking-wide text-ink-lt hover:text-sage transition-colors"
          >
            log in
          </button>
          <button
            onClick={onStartClick}
            className="px-5 py-2.5 text-sm bg-sage text-white hover:bg-sage-dk rounded transition-colors uppercase tracking-wide font-medium"
          >
            start free
          </button>
        </div>
      </div>
    </nav>
  )
}
