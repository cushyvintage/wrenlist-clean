/**
 * Badge Component
 * Status badge for inventory items (listed, draft, on_hold, sold)
 *
 * Design: Tailwind-based with color mapping per status
 * Matches design mockup pg-inventory badge styles
 *
 * @example
 * <Badge status="listed" />
 * <Badge status="sold" />
 */

type BadgeStatus = 'listed' | 'draft' | 'on_hold' | 'sold'

interface BadgeProps {
  /** Status value to display */
  status: BadgeStatus
  /** Optional custom label (defaults to status) */
  label?: string
}

const statusConfig: Record<
  BadgeStatus,
  { bg: string; text: string; label: string; bgStyle?: string; textStyle?: string }
> = {
  listed: {
    bg: 'bg-sage-pale',
    text: 'text-sage',
    label: 'listed',
  },
  draft: {
    bg: 'bg-cream-dk',
    text: 'text-ink-lt',
    label: 'draft',
  },
  on_hold: {
    bg: 'bg-amber-lt',
    text: 'text-amber',
    label: 'on hold',
  },
  sold: {
    bg: '',
    text: '',
    label: 'sold',
    bgStyle: '#D4E2D2',
    textStyle: '#3D5C3A',
  },
}

export function Badge({ status, label }: BadgeProps) {
  const config = statusConfig[status]
  const displayLabel = label || config.label

  return (
    <span
      className={`inline-block px-3 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}
      style={config.bgStyle ? { backgroundColor: config.bgStyle, color: config.textStyle } : undefined}
    >
      {displayLabel}
    </span>
  )
}
