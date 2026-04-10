/**
 * StatCard Component
 * Displays a single statistic with label, value, and optional delta
 *
 * Design: cream-md background, no border, DM Mono for values
 * Matches design mockup pg-dashboard stat-card
 *
 * @example
 * <StatCard
 *   label="active finds"
 *   value="147"
 *   delta="+12 this week"
 * />
 */

interface StatCardProps {
  /** Label text (uppercase, muted) */
  label: string
  /** Main value display (DM Mono font) */
  value: string | number
  /** Optional change indicator (green for positive) */
  delta?: string
  /** Optional prefix (e.g., "£") */
  prefix?: string
  /** Optional suffix (e.g., "%") */
  suffix?: string
  /** Extra className (e.g. `stat-card-stagger` for entrance animation) */
  className?: string
}

export function StatCard({
  label,
  value,
  delta,
  prefix = '',
  suffix = '',
  className = '',
}: StatCardProps) {
  return (
    <div className={`bg-cream-md rounded-md p-5 ${className}`.trim()}>
      {/* Label: 10px uppercase sage-dim */}
      <div className="text-[10px] uppercase tracking-[.09em] text-sage-dim font-medium mb-2">
        {label}
      </div>

      {/* Value: Serif 30px */}
      <div className="font-serif text-[30px] font-medium text-ink mb-1" style={{ lineHeight: '1' }}>
        {prefix && <span className="font-mono text-base">{prefix}</span>}
        {value}
        {suffix && <span className="font-mono text-base">{suffix}</span>}
      </div>

      {/* Delta: 11px, green for positive */}
      {delta && (
        <div className="text-[11px] font-medium text-status-success">
          {delta}
        </div>
      )}
    </div>
  )
}
