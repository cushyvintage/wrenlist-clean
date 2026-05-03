import type { AIAutoFillData } from '@/components/add-find/AIAutoFillBanner'

/**
 * Single source of truth for which AIAutoFillData fields make it into
 * `ai_corrections.suggestion`. Three call sites (apply, refine, final
 * log) used to maintain three near-identical projections — easy to drift,
 * trivial for a new field on AIAutoFillData to silently miss being
 * logged. Centralising here means adding a new analytics-relevant field
 * is a one-line change in one file.
 *
 * UI-only flags (priceLoading) stay out by design.
 */
const ANALYTICS_FIELDS: ReadonlyArray<keyof AIAutoFillData> = [
  'title',
  'description',
  'category',
  'condition',
  'suggestedQuery',
  'suggestedPrice',
  'priceReasoning',
  'confidence',
]

export interface SuggestionLogOptions {
  /**
   * Confidence at the moment of the FIRST identify, before any refinement.
   * Pass on `applied` and `refined` rows so we can tell apart "Wren was
   * confident from the start" from "Wren got there after a refinement".
   * Skip on `final` rows — the `suggestion` blob there already IS the
   * original, so its `confidence` is the original confidence.
   */
  originalConfidence?: 'high' | 'medium' | 'low'
}

export type SuggestionForLog = Partial<AIAutoFillData> & {
  originalConfidence?: 'high' | 'medium' | 'low'
}

export function pickSuggestionForLog(
  s: AIAutoFillData,
  options: SuggestionLogOptions = {},
): SuggestionForLog {
  const out: SuggestionForLog = {}
  for (const key of ANALYTICS_FIELDS) {
    const value = s[key]
    if (value !== undefined) {
      // Loop body is well-typed: `key` is keyof AIAutoFillData, but the
      // helper returns Partial<AIAutoFillData> so the assign is safe.
      // TS can't narrow value/key relationship across the loop without
      // a switch, hence the cast.
      ;(out as Record<string, unknown>)[key] = value
    }
  }
  if (options.originalConfidence) {
    out.originalConfidence = options.originalConfidence
  }
  return out
}
