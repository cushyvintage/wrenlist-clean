/**
 * EmptyState Component
 * Centered empty state with icon, title, description, and optional CTA
 *
 * @example
 * <EmptyState
 *   icon="📦"
 *   title="No items yet"
 *   description="Add your first find to get started"
 *   action={{ label: 'Add find', href: '/add-find' }}
 * />
 */

interface EmptyStateProps {
  icon: string
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h2 className="text-lg font-medium text-ink mb-2">{title}</h2>
      <p className="text-sm text-ink-lt mb-6 max-w-xs">{description}</p>
      {action && (
        <a
          href={action.href || '#'}
          onClick={(e) => {
            if (action.onClick) {
              e.preventDefault()
              action.onClick()
            }
          }}
          className="inline-block px-4 py-2 bg-sage text-cream rounded font-medium text-sm hover:bg-sage-dk transition-colors"
        >
          {action.label}
        </a>
      )}
    </div>
  )
}
