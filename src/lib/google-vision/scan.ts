/**
 * Google Vision scan-pass for the identify pipeline.
 *
 * Given the seller's first photo, calls Vision with three features:
 *   - TEXT_DETECTION  → OCR (often outperforms GPT-4o on tiny printed text)
 *   - WEB_DETECTION   → web matches + best-guess label + named entities
 *   - LOGO_DETECTION  → brand-logo classifier
 *
 * Returns a typed, simplified summary that's safe to feed into the
 * identify prompt. Each feature is best-effort: a feature returning
 * nothing is fine, the identifier falls back to other pre-pass signals
 * (LLM scanner, eBay similar listings).
 *
 * Cached by image hash via the same withImageCache layer everything
 * else uses, so re-runs on the same photo cost £0.
 */

import { withImageCache } from '../ai/image-cache'
import { annotateImage } from './client'

export const GOOGLE_VISION_SCAN_VERSION = 1

export interface GoogleVisionScanResult {
  /** Full OCR transcript (newline-joined), trimmed. Empty string if Vision found nothing. */
  ocrText: string
  /** Best-guess label Google computes from web matches (e.g. "Royal Doulton plate"). */
  bestGuessLabel: string
  /** Named entities Vision extracted from the matching pages (e.g. ["Wedgwood", "Jasperware"]). */
  webEntities: string[]
  /** Titles of pages on the open web that contain the same image. */
  webPageTitles: string[]
  /** Brand logos detected, with confidence. */
  logos: Array<{ name: string; score: number }>
}

const EMPTY: GoogleVisionScanResult = {
  ocrText: '',
  bestGuessLabel: '',
  webEntities: [],
  webPageTitles: [],
  logos: [],
}

interface Args {
  userId: string
  imageDataUrl: string
}

export async function googleVisionScan({ userId, imageDataUrl }: Args): Promise<GoogleVisionScanResult> {
  if (!imageDataUrl) return EMPTY
  const base64 = imageDataUrl.startsWith('data:') ? imageDataUrl.split(',')[1] ?? '' : imageDataUrl
  if (!base64) return EMPTY

  try {
    return await withImageCache<GoogleVisionScanResult>(
      {
        userId,
        imageBuffer: base64,
        // Reusing the AI cache table — purpose 'scan_marks' is the closest
        // semantic fit (it's an OCR-and-recognition pre-pass) but with a
        // distinct prompt-version namespace so we don't collide with the
        // LLM scanner's cache entries.
        purpose: 'scan_marks',
        model: 'gpt-4o', // unused for non-LLM path; placeholder for cache key
        promptVersion: 1000 + GOOGLE_VISION_SCAN_VERSION,
      },
      async () => {
        const r = await annotateImage({
          imageBase64: base64,
          features: ['TEXT_DETECTION', 'WEB_DETECTION', 'LOGO_DETECTION'],
          maxResults: 10,
        })

        const ocrText = (r.fullTextAnnotation?.text ?? '').trim()
        const bestGuessLabel = (r.webDetection?.bestGuessLabels?.[0]?.label ?? '').trim()
        const webEntities = (r.webDetection?.webEntities ?? [])
          .filter((e) => typeof e.description === 'string' && (e.score ?? 0) >= 0.3)
          .map((e) => e.description!)
          .slice(0, 8)
        const webPageTitles = (r.webDetection?.pagesWithMatchingImages ?? [])
          .map((p) => p.pageTitle?.trim())
          .filter((t): t is string => typeof t === 'string' && t.length > 0)
          .slice(0, 5)
        const logos = (r.logoAnnotations ?? [])
          .map((l) => ({ name: l.description ?? '', score: l.score ?? 0 }))
          .filter((l) => l.name && l.score >= 0.5)
          .slice(0, 5)

        return { ocrText, bestGuessLabel, webEntities, webPageTitles, logos }
      },
    )
  } catch (error) {
    console.warn('[google-vision] scan failed:', error)
    return EMPTY
  }
}

/**
 * Format the Vision scan for inclusion in the identify prompt. Returns
 * a stable, easy-to-parse block. Empty sections are omitted to keep the
 * prompt clean.
 */
export function formatVisionScanForPrompt(scan: GoogleVisionScanResult): string {
  const parts: string[] = ['GOOGLE VISION SCAN (independent OCR + web search):']
  if (scan.ocrText) {
    // Truncate enormous OCR results — sometimes Vision dumps a whole
    // certificate of authenticity. 600 chars is plenty of context.
    const truncated = scan.ocrText.length > 600 ? scan.ocrText.slice(0, 600) + '…' : scan.ocrText
    parts.push(`- OCR text (verbatim): ${JSON.stringify(truncated)}`)
  } else {
    parts.push('- OCR text: none detected')
  }
  if (scan.bestGuessLabel) {
    parts.push(`- Best-guess label: "${scan.bestGuessLabel}"`)
  }
  if (scan.webEntities.length) {
    parts.push(`- Named entities from matching web pages: ${scan.webEntities.map(e => `"${e}"`).join(', ')}`)
  }
  if (scan.webPageTitles.length) {
    parts.push(`- Page titles for web matches: ${scan.webPageTitles.map(t => `"${t}"`).join('; ')}`)
  }
  if (scan.logos.length) {
    parts.push(`- Detected logos: ${scan.logos.map(l => `${l.name} (${(l.score * 100).toFixed(0)}%)`).join(', ')}`)
  }
  return parts.join('\n')
}
