/**
 * Shared helper for AI category refinement (step 2).
 * Given a top-level category and image URL(s), picks the best leaf category
 * from CATEGORY_TREE using an LLM call.
 *
 * For top-levels with >50 subcategories (collectibles, sports_outdoors,
 * vehicles_parts, home_garden), uses L2 prefix grouping to keep prompts short.
 */

import { getAllCategories, type CategoryRow } from '@/lib/category-db'
import { modelFor } from '@/lib/ai/router'

const MAX_DIRECT_SUBCATS = 50

interface SubcatInfo {
  values: string[]
  labels: Map<string, string>  // value → label
}

/** Get all leaf values and labels under a top-level from pre-loaded rows */
function getSubcatInfo(topLevel: string, allCategories: CategoryRow[]): SubcatInfo {
  const entries = allCategories.filter((c) => c.top_level === topLevel)
  if (entries.length === 0) return { values: [], labels: new Map() }
  return {
    values: entries.map((n) => n.value),
    labels: new Map(entries.map((n) => [n.value, n.label])),
  }
}

/** Extract unique L2 prefixes from leaf values under a top-level */
function getL2Prefixes(topLevel: string, values: string[]): string[] {
  const prefixLen = topLevel.length + 1 // e.g. "collectibles_"
  const prefixes = new Set<string>()
  for (const v of values) {
    const rest = v.slice(prefixLen) // e.g. "ceramics_plates"
    const firstSeg = rest.split('_')[0]
    if (firstSeg) prefixes.add(topLevel + '_' + firstSeg)
  }
  return [...prefixes].sort()
}

/** Get all leaf values that start with a given L2 prefix */
function getLeavesForPrefix(prefix: string, values: string[]): string[] {
  return values.filter(v => v.startsWith(prefix + '_') || v === prefix)
}

/** Make a single OpenAI chat completion request */
async function llmCall(
  apiKey: string,
  imageUrl: string,
  textPrompt: string,
  maxTokens: number = 60
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelFor('category_refine'),
      max_tokens: maxTokens,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
          { type: 'text', text: textPrompt },
        ],
      }],
    }),
  })

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`)

  const data = await response.json() as { choices: Array<{ message: { content: string } }> }
  const raw = data.choices[0]?.message?.content?.toLowerCase().trim() ?? ''
  return raw.replace(/[^a-z0-9_]/g, '')
}

/**
 * Refine a top-level category to a leaf category using an LLM call.
 * Returns the leaf category value, or falls back to the first leaf or the top-level.
 *
 * @param topLevel - The top-level category (e.g. "clothing")
 * @param imageUrl - URL of the item image
 * @param apiKey - OpenAI API key
 * @param itemTitle - Optional item title for context (used by identify-from-photo)
 */
export async function refineToLeafCategory(
  topLevel: string,
  imageUrl: string,
  apiKey: string,
  itemTitle?: string,
): Promise<string> {
  const allCategories = await getAllCategories(topLevel)
  const { values, labels } = getSubcatInfo(topLevel, allCategories)

  // No subcategories or "other" — return as-is
  if (topLevel === 'other' || values.length <= 1) {
    return values[0] ?? topLevel
  }

  const titleContext = itemTitle
    ? `This is a "${itemTitle}" in the "${topLevel.replace(/_/g, ' ')}" category.`
    : `This item is in the "${topLevel.replace(/_/g, ' ')}" category.`

  try {
    if (values.length <= MAX_DIRECT_SUBCATS) {
      // Small enough — send all leaf values directly
      const optionsList = values.map(v => {
        const label = labels.get(v) ?? v
        return `${v} (${label})`
      }).join(', ')

      const result = await llmCall(
        apiKey,
        imageUrl,
        `${titleContext} Which specific subcategory best fits? Options: ${optionsList}. Reply with ONLY the subcategory value (the part before the parentheses), nothing else.`,
      )

      if (values.includes(result)) return result
    } else {
      // Large category — two-step: pick L2 prefix, then pick leaf
      const l2Prefixes = getL2Prefixes(topLevel, values)

      // Build readable L2 options with label hints
      const l2Options = l2Prefixes.map(p => {
        const leaves = getLeavesForPrefix(p, values)
        const sampleLabels = leaves.slice(0, 3).map(l => labels.get(l) ?? '').filter(Boolean)
        const hint = sampleLabels.length > 0 ? ` (e.g. ${sampleLabels.join(', ')})` : ''
        return `${p}${hint}`
      }).join(', ')

      const l2Result = await llmCall(
        apiKey,
        imageUrl,
        `${titleContext} Which group best fits? Options: ${l2Options}. Reply with ONLY the group value (the part before any parentheses), nothing else.`,
      )

      // Find the matching L2 prefix
      const matchedPrefix = l2Prefixes.find(p => p === l2Result)
        ?? l2Prefixes.find(p => l2Result.startsWith(p))

      if (matchedPrefix) {
        const leaves = getLeavesForPrefix(matchedPrefix, values)

        if (leaves.length === 1 && leaves[0]) {
          return leaves[0]
        }

        // Step 2b: pick specific leaf under this L2 prefix
        const leafOptions = leaves.map(v => {
          const label = labels.get(v) ?? v
          return `${v} (${label})`
        }).join(', ')

        const leafResult = await llmCall(
          apiKey,
          imageUrl,
          `${titleContext} Which specific subcategory best fits? Options: ${leafOptions}. Reply with ONLY the subcategory value (the part before the parentheses), nothing else.`,
        )

        if (leaves.includes(leafResult)) return leafResult

        // If LLM returned something close, try partial match
        const partialMatch = leaves.find(l => l.includes(leafResult) || leafResult.includes(l))
        if (partialMatch) return partialMatch

        // Fall back to first leaf in the matched prefix group
        if (leaves[0]) return leaves[0]
      }
    }
  } catch {
    // Step 2 failed — fall through to fallback
  }

  // Fallback: first subcategory value or top-level
  return values[0] ?? topLevel
}
