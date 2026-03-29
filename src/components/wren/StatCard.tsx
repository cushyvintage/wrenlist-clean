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
}

export function StatCard({
  label,
  value,
  delta,
  prefix = '',
  suffix = '',
}: StatCardProps) {
  return (
    <div className="bg-cream-md rounded-md p-5 border border-sage/14">
      {/* Label: 10px uppercase sage-dim */}
      <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-3">
        {label}
      </div>

      {/* Value: Cormorant Garamond 30px (using serif) */}
      <div className="font-serif text-3xl font-normal text-ink mb-2">
        <span className="font-mono text-2xl">{prefix}</span>
        {value}
        <span className="font-mono text-2xl">{suffix}</span>
      </div>

      {/* Delta: 11px, green for positive */}
      {delta && (
        <div className="text-xs text-green-600 font-medium">
          {delta}
        </div>
      )}
    </div>
  )
}
