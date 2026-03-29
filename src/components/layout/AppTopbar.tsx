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
}

export function AppTopbar({
  title,
  breadcrumb,
  actions = [],
  rightSlot,
  className = '',
}: AppTopbarProps) {
  return (
    <header
      className={`fixed top-0 left-52 right-0 bg-white border-b border-sage/14 h-16 flex items-center justify-between px-6 ${className}`}
    >
      {/* Left side: title + breadcrumb */}
      <div className="flex-1">
        {breadcrumb && (
          <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-1">
            {breadcrumb}
          </div>
        )}
        {title && <h1 className="font-serif text-2xl text-ink">{title}</h1>}
      </div>

      {/* Center: search or other content */}
      {/* Placeholder for search/filter */}

      {/* Right side: actions + notifications */}
      <div className="flex items-center gap-4">
        {/* Action buttons */}
        <div className="flex gap-2">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className={
                action.variant === 'secondary'
                  ? 'px-4 py-2 text-sm bg-cream-md text-ink hover:bg-cream-dk rounded transition-colors'
                  : 'px-4 py-2 text-sm bg-sage text-white hover:bg-sage-dk rounded transition-colors font-medium'
              }
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Right slot (notifications, avatar, etc) */}
        {rightSlot && <div className="flex items-center gap-3 pl-4 border-l border-sage/14">{rightSlot}</div>}
      </div>
    </header>
  )
}
