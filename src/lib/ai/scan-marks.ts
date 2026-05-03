/**
 * Pre-pass for identify-from-photo: scans every supplied photo for any
 * stamp, signature, sticker, label, or printed text and transcribes it
 * verbatim. The result feeds back into the identify prompt as ground-truth
 * data the second-pass model can use without having to also do the reading.
 *
 * Two-pass design — why bother:
 *   v3 prompt got Wren refusing to invent makers (good) but also still
 *   refusing to read marks confidently when they were genuinely there
 *   (Bevington, Sadler — "label visible but too small to transcribe").
 *   A dedicated scanning pass with a narrower job ("just transcribe") is
 *   measurably better at OCR than asking the same model to also identify,
 *   classify, and write a listing in the same call.
 *
 * Cached by image hash — re-scanning the same photo set is free.
 *
 * Failure mode: if scanner errors or returns garbage, we just feed an empty
 * marks list to identify. Identifier still has the photos, so worst case is
 * the same accuracy as v3 — never worse.
 */

import { withImageCache } from './image-cache'
import { modelFor } from './router'

export const SCAN_MARKS_PROMPT_VERSION = 1

export interface DetectedMark {
  text: string
  location: string
  /**
   * 'clear'  — read every letter unambiguously
   * 'partial' — visible but some letters uncertain (e.g. 'G_INDLE_ ENGLAND')
   * 'illegible' — visible but too small/blurry/obscured to transcribe
   */
  legibility: 'clear' | 'partial' | 'illegible'
}

export interface MarkScanResult {
  marks: DetectedMark[]
}

interface ScanArgs {
  userId: string
  images: string[]
  apiKey: string
}

const EMPTY_RESULT: MarkScanResult = { marks: [] }

export async function scanMarks({ userId, images, apiKey }: ScanArgs): Promise<MarkScanResult> {
  if (!images.length) return EMPTY_RESULT

  const model = modelFor('scan_marks')
  const cacheInput = images.join('|')

  try {
    return await withImageCache<MarkScanResult>(
      {
        userId,
        imageBuffer: cacheInput,
        purpose: 'scan_marks',
        model,
        promptVersion: SCAN_MARKS_PROMPT_VERSION,
      },
      async () => {
        const imageContent = images.map((dataUrl) => ({
          type: 'image_url' as const,
          image_url: { url: dataUrl, detail: 'high' as const },
        }))

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: 400,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `You are an OCR specialist for vintage and antique items. You will receive 1–5 photos of an item. Examine EVERY photo carefully for any text — maker stamps, brand labels, paper stickers, signatures, dates, model numbers, country of origin, anything printed or engraved.

Your only job is to transcribe what you literally see, letter by letter. Do not interpret, identify, or infer. If a stamp is partially obscured, transcribe the visible characters and use _ for unreadable letters (e.g. 'GR_NDL_Y ENGLAND'). If a mark is visible but too small or blurred to attempt, label it 'illegible'.

CRITICAL: Never substitute a famous similar-looking maker. A stamp shaped like 'G____Y' is not 'Shelley' — it's '<6 letters, starts with G, ends with Y, illegible middle>'. Verbatim only.`,
              },
              {
                role: 'user',
                content: [
                  ...imageContent,
                  {
                    type: 'text',
                    text: `For every visible mark across these photos, return JSON in this exact shape:

{
  "marks": [
    { "text": "GRINDLEY ENGLAND", "location": "base of egg cup, blue stamp under crown logo", "legibility": "clear" },
    { "text": "BONE CHINA", "location": "base of egg cup, below maker stamp", "legibility": "clear" },
    { "text": "Made in ___ny", "location": "white sticker on side", "legibility": "partial" },
    { "text": "", "location": "back of plate, oval blue stamp", "legibility": "illegible" }
  ]
}

If no marks are visible at all, return { "marks": [] }. Do not invent marks.`,
                  },
                ],
              },
            ],
          }),
        })

        if (!response.ok) {
          throw new Error(`OpenAI scan_marks error: ${response.status}`)
        }

        const data = await response.json() as { choices: Array<{ message: { content: string } }> }
        const raw = data.choices[0]?.message?.content?.trim() ?? '{}'
        const content = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
        const parsed = JSON.parse(content) as { marks?: unknown }

        if (!parsed.marks || !Array.isArray(parsed.marks)) return EMPTY_RESULT

        const marks: DetectedMark[] = []
        for (const m of parsed.marks) {
          if (!m || typeof m !== 'object') continue
          const obj = m as Record<string, unknown>
          const text = typeof obj.text === 'string' ? obj.text : ''
          const location = typeof obj.location === 'string' ? obj.location : 'unknown location'
          const legibilityRaw = typeof obj.legibility === 'string' ? obj.legibility : 'illegible'
          const legibility: DetectedMark['legibility'] =
            legibilityRaw === 'clear' || legibilityRaw === 'partial' || legibilityRaw === 'illegible'
              ? legibilityRaw
              : 'illegible'
          marks.push({ text, location, legibility })
        }
        return { marks }
      },
    )
  } catch (error) {
    console.error('[scan-marks] failed; identify will run without marks context:', error)
    return EMPTY_RESULT
  }
}

/**
 * Format a mark scan result for inclusion in the identify prompt. Returns
 * an empty string if no marks worth mentioning — keeps the prompt clean
 * for items with no visible marks.
 */
export function formatMarksForPrompt(result: MarkScanResult): string {
  if (!result.marks.length) {
    return 'MARKS DETECTED: none found in any photo.'
  }
  const lines = result.marks.map((m) => {
    if (m.legibility === 'clear' && m.text) {
      return `- "${m.text}" (${m.location}) — read clearly`
    }
    if (m.legibility === 'partial' && m.text) {
      return `- "${m.text}" (${m.location}) — partial; some letters uncertain`
    }
    return `- mark visible at ${m.location} but too small/blurry to read`
  })
  return `MARKS DETECTED IN PHOTOS (verbatim, from a dedicated OCR pass):\n${lines.join('\n')}`
}
