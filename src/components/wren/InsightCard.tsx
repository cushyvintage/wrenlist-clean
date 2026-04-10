/**
 * InsightCard Component
 * Displays a "Wren insight" with contextual recommendation
 *
 * Design: cream-md bg, eyebrow label, italic Cormorant text, link
 * Supports type-based styling: alert (amber), tip (sage), info (grey)
 * Optional dismiss button mutes the insight for a configurable period.
 *
 * @example
 * <InsightCard
 *   text="Your house clearance finds convert 40% faster than charity shop finds."
 *   type="tip"
 *   link={{ text: "see full analysis →", onClick: () => {} }}
 *   onDismiss={() => fetch('/api/insights/dismiss', ...)}
 * />
 */

import { useState } from 'react'

interface InsightCardProps {
  /** The insight text (will be italicized) */
  text: string
  /** Type of insight: alert (amber), tip (sage), info (grey) */
  type?: 'alert' | 'tip' | 'info'
  /** Optional action link. Use router.push in onClick for client-side routing. */
  link?: {
    text: string
    onClick: () => void
  }
  /** If provided, shows an × dismiss button in the top-right. */
  onDismiss?: () => void
}

export function InsightCard({ text, type = 'info', link, onDismiss }: InsightCardProps) {
  const [dismissing, setDismissing] = useState(false)

  const styles = {
    alert: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      eyebrow: 'text-amber-600',
      text: 'text-amber-900',
      link: 'text-amber-600 hover:text-amber-700',
      dismiss: 'text-amber-400 hover:text-amber-600',
    },
    tip: {
      bg: 'bg-sage-lt/20',
      border: 'border-sage/14',
      eyebrow: 'text-sage-dim',
      text: 'text-sage-dk',
      link: 'text-sage-lt hover:text-sage',
      dismiss: 'text-sage-dim hover:text-sage',
    },
    info: {
      bg: 'bg-cream-md',
      border: 'border-sage/14',
      eyebrow: 'text-sage-dim',
      text: 'text-ink',
      link: 'text-sage-lt hover:text-sage',
      dismiss: 'text-sage-dim hover:text-sage',
    },
  }

  const style = styles[type]

  const handleDismiss = () => {
    if (!onDismiss || dismissing) return
    setDismissing(true)
    onDismiss()
  }

  return (
    <div className={`${style.bg} rounded-md p-5 border ${style.border} relative transition-opacity ${dismissing ? 'opacity-40' : ''}`}>
      {onDismiss && (
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          aria-label="Dismiss insight for 7 days"
          title="Dismiss for 7 days"
          className={`absolute top-3 right-3 ${style.dismiss} transition-colors text-lg leading-none`}
        >
          ×
        </button>
      )}

      <div className={`text-xs uppercase tracking-widest ${style.eyebrow} font-medium mb-2 pr-6`}>
        wren insight · beta
      </div>

      <div className={`font-serif text-sm ${style.text} italic mb-3 leading-relaxed`}>
        &ldquo;{text}&rdquo;
      </div>

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
