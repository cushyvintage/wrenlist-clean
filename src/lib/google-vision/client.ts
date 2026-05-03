/**
 * Google Cloud Vision client.
 *
 * One server-side helper that calls the Vision API's `images:annotate`
 * endpoint with a configurable feature set. Vision is API-key authed
 * (no OAuth) — the key in GOOGLE_VISION_API_KEY is restricted to the
 * Cloud Vision API and has no application-restriction (server-side use).
 *
 * We use this as a fourth pre-pass alongside the LLM mark scanner and
 * eBay searchByImage. Each Vision feature is independently useful:
 *
 *   TEXT_DETECTION — Google's OCR. Often beats GPT-4o on small printed
 *     text on stamps. Returns the full transcribed text plus per-word
 *     bounding boxes.
 *   WEB_DETECTION — closest public-API equivalent to Google Lens. Returns
 *     web matches for the image: best-guess label, matching pages, web
 *     entities (named things — "Wedgwood", "Jasperware", etc.).
 *   LOGO_DETECTION — Google's brand-logo classifier. Catches well-known
 *     manufacturer logos directly (less useful for hand-stamped pottery,
 *     more useful for branded ceramics / silverware).
 *
 * Cost: $1.50 per 1000 calls per feature. Batched into a single
 * `images:annotate` request, all features apply to the same image, so
 * three features × one image = three units against the quota.
 */

const ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate'

export type VisionFeature =
  | 'TEXT_DETECTION'
  | 'WEB_DETECTION'
  | 'LOGO_DETECTION'

export interface VisionResponse {
  textAnnotations?: Array<{ description?: string; locale?: string }>
  fullTextAnnotation?: { text?: string }
  webDetection?: {
    webEntities?: Array<{ entityId?: string; score?: number; description?: string }>
    fullMatchingImages?: Array<{ url?: string }>
    partialMatchingImages?: Array<{ url?: string }>
    pagesWithMatchingImages?: Array<{ url?: string; pageTitle?: string; fullMatchingImages?: unknown[] }>
    visuallySimilarImages?: Array<{ url?: string }>
    bestGuessLabels?: Array<{ label?: string; languageCode?: string }>
  }
  logoAnnotations?: Array<{ description?: string; score?: number }>
  error?: { message?: string; code?: number }
}

interface AnnotateArgs {
  /** base64 image bytes (no data URL prefix). */
  imageBase64: string
  features: VisionFeature[]
  /** Per-feature max results. Vision applies it differently per feature; defaults are sane. */
  maxResults?: number
}

/**
 * Call Vision images:annotate for one image. Returns the raw response
 * for the caller to interpret. Failures fall through to a synthetic
 * empty response — never throws — so callers can treat Vision as
 * best-effort additional context.
 */
export async function annotateImage({ imageBase64, features, maxResults = 10 }: AnnotateArgs): Promise<VisionResponse> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[google-vision] GOOGLE_VISION_API_KEY not set; skipping')
    }
    return {}
  }
  if (!imageBase64) return {}

  try {
    const response = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: features.map((type) => ({ type, maxResults })),
          },
        ],
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      console.warn(`[google-vision] HTTP ${response.status}: ${text.slice(0, 200)}`)
      return {}
    }

    const data = (await response.json()) as { responses?: VisionResponse[] }
    return data.responses?.[0] ?? {}
  } catch (error) {
    console.warn('[google-vision] threw, returning empty:', error)
    return {}
  }
}
