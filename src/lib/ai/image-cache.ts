/**
 * Image-hash cache wrapper for OpenAI vision calls.
 *
 * Same image bytes uploaded twice → same OpenAI result, served from cache
 * without burning another £0.025 vision call. Cache key is
 * (image_hash, purpose, model, prompt_version, user_id).
 *
 * Usage:
 *
 *   const result = await withImageCache({
 *     userId: user.id,
 *     imageBuffer: imageBytes,
 *     purpose: 'identify_from_photo',
 *     model: 'gpt-4o',
 *     promptVersion: 1,
 *   }, async () => {
 *     // expensive OpenAI call only runs on cache miss
 *     return await openaiVisionCall(...)
 *   })
 *
 * The wrapper handles SHA-256, Supabase lookup, fallback to OpenAI on miss,
 * and writeback. Failures fall through to the live call — cache must never
 * be the reason a request fails.
 */

import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import type { AIPurpose, AIModel } from './router'

interface CacheKey {
  userId: string
  imageBuffer: Buffer | Uint8Array | string  // bytes, base64, or data URL — all hashed
  purpose: AIPurpose
  model: AIModel
  promptVersion?: number
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

/**
 * Hash an image input. Accepts Buffer, Uint8Array, base64 string, or data
 * URL — all normalised to raw bytes before SHA-256.
 */
export function hashImage(input: Buffer | Uint8Array | string): string {
  let bytes: Buffer
  if (typeof input === 'string') {
    // Strip data URL prefix if present
    const b64 = input.startsWith('data:') ? input.split(',')[1] ?? '' : input
    bytes = Buffer.from(b64, 'base64')
  } else if (input instanceof Buffer) {
    bytes = input
  } else {
    bytes = Buffer.from(input)
  }
  return createHash('sha256').update(bytes).digest('hex')
}

/**
 * Wrap an OpenAI call with image-hash caching. On miss, runs `compute` and
 * stores the result. On hit, returns the cached result and bumps hit_count.
 *
 * Cache failures (DB unreachable, etc.) never block the live call — we just
 * skip the cache and call OpenAI directly. Better a redundant £0.025 spend
 * than a 500.
 */
export async function withImageCache<T>(
  key: CacheKey,
  compute: () => Promise<T>,
): Promise<T> {
  const promptVersion = key.promptVersion ?? 1
  const imageHash = hashImage(key.imageBuffer)
  const supabase = adminClient()

  // Lookup
  try {
    const { data: cached } = await supabase
      .from('ai_image_cache')
      .select('id, result_json, hit_count')
      .eq('image_hash', imageHash)
      .eq('purpose', key.purpose)
      .eq('model', key.model)
      .eq('prompt_version', promptVersion)
      .eq('user_id', key.userId)
      .maybeSingle()

    if (cached) {
      // Fire-and-forget hit_count bump — don't block the response on it
      void supabase
        .from('ai_image_cache')
        .update({
          hit_count: (cached.hit_count ?? 0) + 1,
          last_hit_at: new Date().toISOString(),
        })
        .eq('id', cached.id)
      return cached.result_json as T
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[ai-cache] lookup failed, falling through to compute:', error)
    }
  }

  // Miss → run the expensive call
  const result = await compute()

  // Writeback (fire-and-forget; the response goes back to the user immediately)
  void (async () => {
    try {
      await supabase.from('ai_image_cache').insert({
        image_hash: imageHash,
        purpose: key.purpose,
        model: key.model,
        prompt_version: promptVersion,
        result_json: result as object,
        user_id: key.userId,
      })
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[ai-cache] writeback failed:', error)
      }
    }
  })()

  return result
}
