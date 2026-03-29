/**
 * InsightCard Component
 * Displays a "Wren insight" with contextual recommendation
 *
 * Design: cream-md bg, eyebrow label, italic Cormorant text, link
 * Matches design mockup insight styling
 *
 * @example
 * <InsightCard
 *   text="Your house clearance finds convert 40% faster than charity shop finds."
 *   link={{ text: "see full analysis →", onClick: () => {} }}
 * />
 */

interface InsightCardProps {
  /** The insight text (will be italicized) */
  text: string
  /** Optional action link */
  link?: {
    text: string
    onClick?: () => void
  }
}

export function InsightCard({ text, link }: InsightCardProps) {
  return (
    <div className="bg-cream-md rounded-md p-5 border border-sage/14">
      {/* Eyebrow label */}
      <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
        wren insight
      </div>

      {/* Italic insight text using Cormorant Garamond */}
      <div className="font-serif text-sm text-ink italic mb-3 leading-relaxed">
        &ldquo;{text}&rdquo;
      </div>

      {/* Optional action link */}
      {link && (
        <button
          onClick={link.onClick}
          className="text-xs text-sage-lt hover:text-sage transition-colors underline cursor-pointer"
        >
          {link.text}
        </button>
      )}
    </div>
  )
}
