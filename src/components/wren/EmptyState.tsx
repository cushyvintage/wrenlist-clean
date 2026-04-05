/**
 * EmptyState Component
 * Centered empty state with SVG icon in cream circle, serif title, and optional CTA.
 * Matches the original Wrenlist design mockup.
 *
 * @example
 * <EmptyState
 *   icon="plus"
 *   title="No items yet"
 *   description="Add your first find to get started"
 *   action={{ label: 'Add find →', href: '/add-find' }}
 * />
 */

type EmptyIcon = 'plus' | 'list' | 'chart' | 'search' | 'cart' | 'receipt' | 'truck' | 'document' | 'tag' | 'shop' | 'box'

interface EmptyStateProps {
  icon: EmptyIcon | React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

const s = { strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const icons: Record<EmptyIcon, React.ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" stroke="currentColor" {...s} />,
  list: <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" {...s} />,
  chart: <path d="M2 20L7 13l5 3 5-7 3 3" stroke="currentColor" {...s} />,
  search: <><circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth={1.5} /><path d="M15 15l5 5" stroke="currentColor" {...s} /></>,
  cart: <><path d="M6 6h15l-2 8H8L6 6z" stroke="currentColor" {...s} /><circle cx="10" cy="20" r="1.5" fill="currentColor" /><circle cx="17" cy="20" r="1.5" fill="currentColor" /></>,
  receipt: <><rect x="4" y="2" width="16" height="20" rx="1" stroke="currentColor" strokeWidth={1.5} /><path d="M8 7h8M8 11h5M8 15h3" stroke="currentColor" {...s} /></>,
  truck: <><circle cx="7" cy="18" r="2.5" stroke="currentColor" strokeWidth={1.5} /><circle cx="17" cy="18" r="2.5" stroke="currentColor" strokeWidth={1.5} /><path d="M9.5 18h5M3 13V8l5-4h6l4 4v5" stroke="currentColor" {...s} /></>,
  document: <path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h4" stroke="currentColor" {...s} />,
  tag: <><path d="M3 3h8l9 9-8 8-9-9V3z" stroke="currentColor" {...s} /><circle cx="8" cy="8" r="1.5" fill="currentColor" /></>,
  shop: <><path d="M3 10L5 3h14l2 7" stroke="currentColor" {...s} /><path d="M3 10v10h18V10" stroke="currentColor" strokeWidth={1.5} /><path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth={1.5} /></>,
  box: <><path d="M3 8l9-4 9 4v10l-9 4-9-4V8z" stroke="currentColor" {...s} /><path d="M3 8l9 4 9-4M12 22V12" stroke="currentColor" {...s} /></>,
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const svgContent = typeof icon === 'string' ? icons[icon as EmptyIcon] : null

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--cream-md, #EDE8DE)' }}
      >
        {svgContent ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--sage-dim, #8A9E88)' }}>
            {svgContent}
          </svg>
        ) : (
          <div style={{ color: 'var(--sage-dim, #8A9E88)' }}>{icon}</div>
        )}
      </div>
      <h2 style={{ fontFamily: 'var(--serif, Georgia, serif)' }} className="text-xl text-ink mb-2">{title}</h2>
      <p className="text-sm text-ink-lt mb-6 max-w-xs font-light">{description}</p>
      {action && (
        <a
          href={action.href || '#'}
          onClick={(e) => {
            if (action.onClick) {
              e.preventDefault()
              action.onClick()
            }
          }}
          className="inline-block px-5 py-2 bg-sage text-cream rounded text-sm font-medium tracking-wide hover:bg-sage-dk transition-colors"
        >
          {action.label}
        </a>
      )}
    </div>
  )
}
