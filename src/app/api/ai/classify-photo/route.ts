import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getTopLevelKeys } from '@/lib/category-db'
import { refineToLeafCategory } from '@/lib/ai-category-refine'
import { modelFor } from '@/lib/ai/router'
import { withImageCache } from '@/lib/ai/image-cache'

const PROMPT_VERSION = 1 // bump when system prompt changes meaningfully

/**
 * Strip query string from Supabase signed URLs so the cache key is stable.
 * Signed URLs include `?token=…&expires=…` that change on every read; the
 * underlying object path is what we want to key on.
 */
function stableImageKey(url: string): string {
  const i = url.indexOf('?')
  return i === -1 ? url : url.slice(0, i)
}

export const POST = withAuth(async (request, user) => {
  const { success } = await checkRateLimit(`classify-photo:${user.id}`, 20)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI features not configured' }, { status: 503 })
  }

  try {
    const VALID_TOP_LEVELS = await getTopLevelKeys()

    const { photoUrl } = await request.json()
    if (!photoUrl) {
      return NextResponse.json({ error: 'Photo URL is required' }, { status: 400 })
    }

    // Step 1: Classify top-level category (16 options — fast, cheap, cached by image)
    const topLevelList = VALID_TOP_LEVELS.join(', ')

    const step1Result = await withImageCache<{ rawTopLevel: string }>(
      {
        userId: user.id,
        imageBuffer: stableImageKey(photoUrl),
        purpose: 'classify_photo',
        model: modelFor('classify_photo'),
        promptVersion: PROMPT_VERSION,
      },
      async () => {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelFor('classify_photo'),
            max_tokens: 20,
            messages: [{
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: photoUrl, detail: 'low' } },
                {
                  type: 'text',
                  text: `Which single category best fits this item: ${topLevelList}? Reply with ONLY the category name (lowercase with underscores), nothing else.`,
                },
              ],
            }],
          }),
        })
        if (!r.ok) throw new Error(`OpenAI error: ${r.status}`)
        const d = await r.json() as { choices: Array<{ message: { content: string } }> }
        return { rawTopLevel: d.choices[0]?.message?.content?.toLowerCase().trim() ?? 'other' }
      },
    )

    let topLevel = step1Result.rawTopLevel
    if (topLevel.includes(':')) topLevel = topLevel.split(':')[1]?.trim() ?? 'other'
    topLevel = topLevel.replace(/[^a-z_]/g, '')
    if (!VALID_TOP_LEVELS.includes(topLevel)) topLevel = 'other'

    // Step 2: Refine to leaf category
    const category = await refineToLeafCategory(
      topLevel,
      photoUrl,
      process.env.OPENAI_API_KEY!,
    )

    const confidence: 'high' | 'medium' | 'low' =
      ['clothing', 'books_media', 'home_garden', 'electronics', 'toys_games', 'art', 'antiques'].includes(topLevel)
        ? 'high'
        : topLevel === 'collectibles' ? 'medium' : 'low'

    return NextResponse.json({ category, topLevel, confidence })
  } catch (error) {
    console.error('Failed to classify photo:', error)
    return NextResponse.json({ error: 'Failed to classify photo' }, { status: 500 })
  }
})
