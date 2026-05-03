/**
 * Reference list of UK-marketplace pottery, ceramics, glass, and
 * collector-plate makers. Used by the identify pipeline as a post-hoc
 * sanity check on whatever maker name the identifier returns. NOT used
 * in the prompt itself — passing the list to the LLM would invite it
 * to pattern-match unknown stamps to the closest famous name on the
 * list, which is the exact failure mode we built v3 to prevent.
 *
 * If the identifier names a maker NOT on this list, we don't refuse
 * the attribution — uncommon makers exist (Bevington & Co., Pinder
 * Bourne, James Kent), and we're not the source of truth for the full
 * universe of pottery houses. We just demote confidence from 'high'
 * to 'medium' and append a "this maker isn't in our reference list,
 * please verify" note. Catches drift early, doesn't punish edge cases.
 *
 * Keep the list lowercase. The lookup function normalises both sides.
 */

const KNOWN_MAKERS_RAW = [
  // UK pottery / china — major
  'wedgwood', 'royal doulton', 'royal worcester', 'royal albert',
  'royal crown derby', 'royal stafford', 'royal winton', 'royal vale',
  'royal stanley', 'royal cauldon', 'royal grafton', 'royal tudor',
  'spode', 'coalport', 'minton', 'aynsley', 'denby', 'hornsea',
  'beswick', 'wade', 'sylvac', 'carlton ware', 'doulton', 'burleigh',
  'shelley', 'paragon', 'tuscan', 'crown staffordshire', 'cauldon',
  'edwardian', 'foley', 'salisbury', 'roslyn', 'crown devon',
  'sadler', 'old hall', 'hammersley', 'meakin', 'alfred meakin',
  'johnson bros', 'johnson brothers', 'adams', 'barratts',
  'barratts of staffordshire', "mason's", 'masons', 'maling',
  'james kent', 'grindley', 'bevington', 'davenport', 'ridgway',
  'copeland', 'new hall', 'worcester', 'collingwood', 'collingwoods',
  'allerton', "allerton's", 't & r boote', 't.g. green', 'tg green',
  'susie cooper', 'clarice cliff', 'charlotte rhead', 'mona ware',
  'brentleigh ware', 'pinder bourne', 'thomas forester',
  'grimwades', 'royal winton grimwades', 'goebel',
  'wedgwood & co', 'midwinter', 'broadhurst', 'biltons',
  'enoch wedgwood',

  // UK / European — collector-plate publishers
  'bradford exchange', 'compton & woodhouse', 'compton and woodhouse',
  'franklin mint', 'danbury mint',

  // International china
  'villeroy & boch', 'villeroy and boch', 'rosenthal', 'bavaria',
  'meissen', 'sevres', 'sèvres', 'limoges', 'quimper',
  'royal copenhagen', 'bing & grøndahl', 'royal tichelaar',
  'royal delft', 'delft', 'noritake', 'arabia',

  // Glass — UK
  'stuart crystal', 'waterford', 'edinburgh crystal', 'royal brierley',
  'tudor crystal', 'webb corbett', 'caithness', 'whitefriars',
  'thomas webb',

  // Glass — international
  'murano', 'hoya', 'holmegaard', 'iittala', 'riihimaki', 'mdina',
  'kosta boda', 'orrefors', 'baccarat',

  // UK Pottery Society / collector
  'royal national rose society', 'national rose society',

  // Others appearing in UK vintage homewares market
  'laura ashley', 'luminarc', 'fait main',
  'selangor pewter', 'selangor', 'beatrix potter',
  'newhall', 'spode copeland', 'grosvenor',

  // Note: deliberately NOT including cross-category single-word brands
  // like "Penguin" (publisher) or "Levi's" (jeans) — they'd false-positive
  // for any pottery/ceramics item the AI happened to attribute to them.
  // If we add proper category-aware validation later, those become safe.
] as const

/**
 * Normalise a maker name for comparison. Strips diacritics, collapses
 * whitespace, removes possessives ('s) and common prefixes ("Antique ",
 * "Vintage "). Used for both the lookup candidate AND each entry in the
 * reference set so they compare apples-to-apples.
 *
 * Diacritic strip uses an explicit \u escape range rather than literal
 * combining characters so the regex survives any editor / git filter
 * that decides to "clean up" non-ASCII bytes in source files.
 */
function normalise(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // strip combining diacritics
    .replace(/[‘’']s\b/g, 's')                // smith's / smith’s → smiths
    .replace(/^\s*(antique|vintage|original|authentic)\s+/i, '')
    .replace(/\s+&\s+/g, ' & ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Crucial: normalise the reference set too, otherwise a candidate
// "Sèvres" → normalises to "sevres" → fails to match a set entry stored
// as "sèvres". We push every entry through the same normaliser so both
// sides compare on a level playing field.
const KNOWN_MAKERS = new Set(KNOWN_MAKERS_RAW.map(normalise))

/**
 * Returns true if the candidate maker is in our known-makers reference
 * list. Tries an exact match, then a "first two words" match (so e.g.
 * "Royal Albert Bone China" matches "royal albert").
 */
export function isKnownMaker(candidate: string | null | undefined): boolean {
  if (!candidate) return false
  const n = normalise(candidate)
  if (!n) return false
  if (KNOWN_MAKERS.has(n)) return true

  // Match the first 1-3 word prefix in case the AI returned "Royal Albert
  // Limited Edition" — we want to credit the "royal albert" part.
  const words = n.split(' ').filter(Boolean)
  for (let i = Math.min(words.length, 4); i >= 1; i--) {
    const prefix = words.slice(0, i).join(' ')
    if (KNOWN_MAKERS.has(prefix)) return true
  }

  // Also check if any KNOWN_MAKER appears as a substring (handles
  // "Adams Wedgwood" → matches "wedgwood"). Length floor avoids matching
  // single common words in long titles.
  for (const known of KNOWN_MAKERS) {
    if (known.length >= 5 && n.includes(known)) return true
  }

  return false
}
