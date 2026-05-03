'use client'

import AIAutoFillBanner, {
  type AIAutoFillData,
  type AIAutoFillResult,
} from '@/components/add-find/AIAutoFillBanner'
import WrenIcon from '@/components/ui/WrenIcon'

interface Props {
  photoCount: number
  isIdentifying: boolean
  aiAutoFill: AIAutoFillData | null
  dismissed: boolean
  hasTitle: boolean
  hasDescription: boolean
  hasCategory: boolean
  hasPrice: boolean
  onAnalyse: () => void
  onApply: (fields: AIAutoFillResult, outcomes: Record<string, 'kept' | 'rejected'>) => void
  onDismiss: () => void
  onRefine?: (feedback: string) => Promise<void> | void
  isRefining?: boolean
  refineError?: string | null
  onClearRefineError?: () => void
  isRefined?: boolean
  onResetToOriginal?: () => void
}

export default function PhotosAIInline({
  photoCount,
  isIdentifying,
  aiAutoFill,
  dismissed,
  hasTitle,
  hasDescription,
  hasCategory,
  hasPrice,
  onAnalyse,
  onApply,
  onDismiss,
  onRefine,
  isRefining,
  refineError,
  onClearRefineError,
  isRefined,
  onResetToOriginal,
}: Props) {
  if (photoCount === 0) return null

  if (isIdentifying) {
    return (
      <div className="mt-4 rounded-lg bg-sage/5 border border-sage/10 px-4 py-3 text-sm text-sage-dim flex items-center gap-2">
        <WrenIcon size="sm" className="animate-pulse" />
        Wren is looking at {photoCount} photo{photoCount !== 1 ? 's' : ''}…
      </div>
    )
  }

  if (aiAutoFill && !dismissed) {
    return (
      <div className="mt-4">
        <AIAutoFillBanner
          data={aiAutoFill}
          hasTitle={hasTitle}
          hasDescription={hasDescription}
          hasCategory={hasCategory}
          hasCondition={false}
          hasPrice={hasPrice}
          onApply={onApply}
          onDismiss={onDismiss}
          onRefine={onRefine}
          isRefining={isRefining}
          refineError={refineError}
          onClearRefineError={onClearRefineError}
          isRefined={isRefined}
          onResetToOriginal={onResetToOriginal}
        />
      </div>
    )
  }

  if (!dismissed) {
    return (
      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={onAnalyse}
          className="w-full rounded-lg border border-sage/20 bg-sage/5 px-4 py-2.5 text-sm text-sage hover:bg-sage/10 transition-colors flex items-center justify-center gap-2"
        >
          <WrenIcon size="sm" />
          Ask Wren about {photoCount === 1 ? 'this photo' : `these ${photoCount} photos`}
        </button>
        {/* Maker marks on ceramics/silver/etc. live on the base. With a
            small/blurry mark Wren has been observed pattern-matching to
            famous similar-shape makers (e.g. confidently calling a Grindley
            stamp "Shelley"). A tight macro shot of the actual mark is what
            gets a confident, correct read. Soft nudge here; the prompt also
            now refuses to guess unclear stamps. */}
        {photoCount <= 4 && (
          <p className="text-xs text-sage-dim text-center px-2">
            Tip: a close-up of the maker's mark on the base lifts identification dramatically.
          </p>
        )}
      </div>
    )
  }

  // After dismiss: small re-analyse link
  return (
    <div className="mt-3 text-center">
      <button
        type="button"
        onClick={onAnalyse}
        className="text-xs text-sage-lt hover:text-sage transition-colors underline underline-offset-2"
      >
        Ask Wren again
      </button>
    </div>
  )
}
