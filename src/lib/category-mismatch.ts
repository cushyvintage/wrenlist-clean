// Pure utility functions for category mismatch detection.
// Extracted from PlatformMappingEditor for testability and reuse.

// Words that are common prefixes/qualifiers — not meaningful for noun comparison
const FILLER_WORDS = new Set([
  'antique', 'antiques', 'vintage', 'other', 'others', 'general', 'misc',
  'miscellaneous', 'various', 'assorted', 'mixed', 'used', 'new', 'modern',
  'classic', 'retro', 'old', 'rare', 'handmade', 'custom', 'mens', 'womens',
  'mens', 'womens', 'kids', 'baby', 'small', 'large', 'medium', 'mini',
])

/** Extract the "core noun" — the last significant word after stripping filler */
export function coreNoun(name: string): string {
  const words = name.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/)
  // Walk from the end to find the first non-filler word
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i] ?? ''
    if (!FILLER_WORDS.has(w) && w.length > 1) return w
  }
  // All words are filler — return the last word as-is
  return words.at(-1) ?? ''
}

/** Flags obvious mismatches like "Antique electronics" mapped to "Other accessories" */
export function isSuspiciousMismatch(categoryLabel: string, mappingName: string): boolean {
  if (!categoryLabel || !mappingName) return false

  const a = categoryLabel.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  const b = mappingName.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  if (a === b) return false

  // Full-string substring check (handles "Books" vs "Antique books")
  const aStripped = a.replace(/\s+/g, '')
  const bStripped = b.replace(/\s+/g, '')
  if (aStripped.includes(bStripped) || bStripped.includes(aStripped)) return false

  // Core noun comparison — the main check
  const nounA = coreNoun(categoryLabel)
  const nounB = coreNoun(mappingName)

  if (nounA && nounB) {
    // Exact match or one contains the other (e.g. "dress" vs "dresses")
    if (nounA === nounB || nounA.includes(nounB) || nounB.includes(nounA)) return false
    // Core nouns are completely different → flag mismatch
    return true
  }

  // Fallback: character-set similarity for edge cases (both nouns empty, etc.)
  const setA = new Set(aStripped.split(''))
  const setB = new Set(bStripped.split(''))
  const intersection = [...setA].filter(c => setB.has(c)).length
  const similarity = intersection / Math.max(setA.size, setB.size)
  return similarity < 0.4
}
