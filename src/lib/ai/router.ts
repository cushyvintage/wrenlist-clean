/**
 * AI router — single place that decides which OpenAI model handles each kind
 * of work. Call sites declare a `purpose`, this file picks the model. When
 * GPT-5 launches or pricing shifts, you change the map here, not 12 call sites.
 *
 * Cost model (as of 2026-04):
 *   gpt-4o          ~£0.025 per vision call (high-detail image)
 *   gpt-4o-mini     ~£0.0005 per text call    (50× cheaper)
 *
 * Vintage/antique image identification keeps the premium model — that's where
 * the magic lives (Royal Doulton backstamps, vintage denim labels, mid-century
 * designer marks). Everything else runs on mini.
 *
 * Add new purposes here, then update the mapping. Don't hardcode `model: 'gpt-4o'`
 * at call sites — declare a purpose instead.
 */

export type AIPurpose =
  | 'identify_from_photo'   // vision-heavy: vintage backstamps, brand labels — needs the good model
  | 'classify_photo'        // category classification from photo — vision but coarser, premium for accuracy
  | 'generate_title'        // text reasoning over identified data
  | 'generate_description'  // text reasoning over identified data
  | 'generate_listing'      // combined title+desc generation
  | 'suggest_category'      // text classification of identified item
  | 'suggest_price'         // text reasoning over comparables
  | 'price_research'        // text summarisation of search results
  | 'category_match'        // taxonomy mapping
  | 'category_refine'       // taxonomy refinement
  | 'barcode_lookup'        // text enrichment from barcode lookup
  | 'wren_chat'             // conversational assistant

export type AIModel = 'gpt-4o' | 'gpt-4o-mini'

const MODEL_FOR: Record<AIPurpose, AIModel> = {
  // Premium vision — vintage/antique recognition is the differentiator
  identify_from_photo:  'gpt-4o',
  classify_photo:       'gpt-4o',

  // Text-only or coarse — mini is plenty
  generate_title:       'gpt-4o-mini',
  generate_description: 'gpt-4o-mini',
  generate_listing:     'gpt-4o-mini',
  suggest_category:     'gpt-4o-mini',
  suggest_price:        'gpt-4o-mini',
  price_research:       'gpt-4o-mini',
  category_match:       'gpt-4o-mini',
  category_refine:      'gpt-4o-mini',
  barcode_lookup:       'gpt-4o-mini',
  wren_chat:            'gpt-4o-mini',
}

export function modelFor(purpose: AIPurpose): AIModel {
  return MODEL_FOR[purpose]
}

/**
 * Hint for whether a purpose involves vision input. Used by the cache layer
 * to decide whether to compute an image hash before calling OpenAI.
 */
export function isVisionPurpose(purpose: AIPurpose): boolean {
  return purpose === 'identify_from_photo' || purpose === 'classify_photo'
}
