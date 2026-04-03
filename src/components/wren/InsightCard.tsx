/**
 * InsightCard Component
 * Displays a "Wren insight" with contextual recommendation
 *
 * Design: cream-md bg, eyebrow label, italic Cormorant text, link
 * Supports type-based styling: alert (amber), tip (sage), info (grey)
 *
 * @example
 * <InsightCard
 *   text="Your house clearance finds convert 40% faster than charity shop finds."
 *   type="tip"
 *   link={{ text: "see full analysis →", onClick: () => {} }}
 * />
 */

interface InsightCardProps {
  /** The insight text (will be italicized) */
  text: string
  /** Type of insight: alert (amber), tip (sage), info (grey) */
  type?: 'alert' | 'tip' | 'info'
  /** Optional action link */
  link?: {
    text: string
    onClick?: () => void
  }
}

export function InsightCard({ text, type = 'info', link }: InsightCardProps) {
  const styles = {
    alert: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      eyebrow: 'text-amber-600',
      text: 'text-amber-900',
      link: 'text-amber-600 hover:text-amber-700',
    },
    tip: {
      bg: 'bg-sage-lt/20',
      border: 'border-sage/14',
      eyebrow: 'text-sage-dim',
      text: 'text-sage-dk',
      link: 'text-sage-lt hover:text-sage',
    },
    info: {
      bg: 'bg-cream-md',
      border: 'border-sage/14',
      eyebrow: 'text-sage-dim',
      text: 'text-ink',
      link: 'text-sage-lt hover:text-sage',
    },
  }

  const style = styles[type]

  return (
    <div className={`${style.bg} rounded-md p-5 border ${style.border}`}>
      {/* Eyebrow label */}
      <div className={`text-xs uppercase tracking-widest ${style.eyebrow} font-medium mb-2`}>
        wren insight
      </div>

      {/* Italic insight text using Cormorant Garamond */}
      <div className={`font-serif text-sm ${style.text} italic mb-3 leading-relaxed`}>
        &ldquo;{text}&rdquo;
      </div>

      {/* Optional action link */}
      {link && (
        <button
          onClick={link.onClick}
          className={`text-xs ${style.link} transition-colors underline cursor-pointer`}
        >
          {link.text}
        </button>
      )}
    </div>
  )
}
