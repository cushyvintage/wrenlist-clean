/**
 * AppTopbar Component
 * Top navigation bar for authenticated app pages
 *
 * Design: white bg with border, contains page title and action buttons
 * Used in app/(auth)/layout.tsx to provide top navigation
 * Fixed position spanning full width except sidebar
 *
 * @example
 * <AppTopbar
 *   title="Inventory"
 *   actions={[
 *     { label: '+ Add find', onClick: () => {} }
 *   ]}
 *   rightSlot={<NotificationBell />}
 * />
 */

interface AppAction {
  /** Button label */
  label: string
  /** Click handler */
  onClick: () => void
  /** Optional variant (default: primary) */
  variant?: 'primary' | 'secondary'
  /** Optional CSS classes */
  className?: string
}

interface AppTopbarProps {
  /** Page title to display */
  title?: string
  /** Optional breadcrumb path */
  breadcrumb?: string
  /** Action buttons to display */
  actions?: AppAction[]
  /** Optional right-side content (search, notifications, etc) */
  rightSlot?: React.ReactNode
  /** Optional custom className */
  className?: string
  /** Callback to open mobile sidebar */
  onMenuClick?: () => void
}

export function AppTopbar({
  title,
  breadcrumb,
  actions = [],
  rightSlot,
  className = '',
  onMenuClick,
}: AppTopbarProps) {
  return (
    <header
      className={`fixed top-0 left-0 md:left-[210px] right-0 h-[60px] flex items-center justify-between px-4 sm:px-7 ${className}`}
      style={{ backgroundColor: '#F5F0E8', borderBottomColor: 'rgba(61,92,58,.14)', borderBottomWidth: '1px' }}
    >
      {/* Left side: hamburger + title + breadcrumb */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Hamburger menu - mobile only */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden p-1.5 -ml-1 rounded transition-colors"
            style={{ color: '#1E2E1C' }}
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M4 6h14M4 11h14M4 16h14" />
            </svg>
          </button>
        )}

        <div className="min-w-0">
          {breadcrumb && (
            <div className="text-[10px] uppercase tracking-[.09em] font-medium mb-1" style={{ color: '#8A9E88' }}>
              {breadcrumb}
            </div>
          )}
          {title && (
            <h1 className="font-serif text-xl sm:text-2xl italic font-normal truncate" style={{ color: '#1E2E1C' }}>
              {title}
            </h1>
          )}
        </div>
      </div>

      {/* Right side: actions + notifications */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Action buttons */}
        {actions.length > 0 && (
          <div className="flex gap-2">
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className="px-3 sm:px-[18px] py-[7px] text-[12px] sm:text-[13px] font-medium rounded transition-colors whitespace-nowrap"
                style={
                  action.variant === 'secondary'
                    ? { backgroundColor: '#EDE8DE', color: '#1E2E1C' }
                    : { backgroundColor: '#3D5C3A', color: '#F5F0E8' }
                }
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Right slot (notifications, avatar, etc) */}
        {rightSlot && (
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4" style={{ borderLeftColor: 'rgba(61,92,58,.14)', borderLeftWidth: '1px' }}>
            {rightSlot}
          </div>
        )}
      </div>
    </header>
  )
}
