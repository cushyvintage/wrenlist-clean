/**
 * Vinted attribute ID → human-readable label mappings
 * Built from Vinted mapper reference data
 */

import { VINTED_COLORS } from '@/data/vinted-colors'

// Build color map from canonical source (avoids duplication)
export const COLOR_MAP: Record<number, string> = Object.fromEntries(
  VINTED_COLORS.map((c) => [c.id, c.title])
)

export const PACKAGE_SIZE_MAP: Record<number, string> = {
  1: 'Small (≤500g)',
  2: 'Medium (≤1kg)',
  3: 'Large (≤2kg)',
  8: 'Heavy S (≤5kg)',
  9: 'Heavy M (≤10kg)',
  10: 'Heavy L (≤20kg)',
}

const OS_MAP: Record<number, string> = {
  3487: 'macOS',
  3488: 'Windows',
  3489: 'Chrome OS',
  3490: 'Linux',
  3491: 'DOS',
  3492: 'Other',
  3493: 'None',
}

const CPU_MAP: Record<number, string> = {
  3393: 'Apple M1',
  3394: 'Apple M1 Pro',
  3395: 'Apple M1 Max',
  3396: 'Apple M2',
  3397: 'Apple M2 Pro',
  3398: 'Apple M2 Max',
  3399: 'Apple M3',
  3400: 'Apple M3 Pro',
  3401: 'Apple M3 Max',
  3402: 'Apple M4',
  3403: 'Apple M4 Pro',
  3404: 'Apple M4 Max',
  3405: 'AMD Ryzen 9',
  3406: 'AMD Ryzen 7',
  3407: 'AMD Ryzen 5',
  3408: 'AMD Ryzen AI',
  3409: 'AMD Ryzen Threadripper',
  3410: 'AMD Ryzen 3',
  3416: 'Intel Core i9',
  3417: 'Intel Core i7',
  3418: 'Intel Core i5',
  3419: 'Intel Core i3',
  3420: 'Intel Core Ultra 9',
  3421: 'Intel Core Ultra 7',
  3422: 'Intel Core Ultra 5',
  3423: 'Intel Core Ultra 3',
  3428: 'Intel Processor 300',
  3429: 'Intel Processor N',
  3430: 'Intel Processor U',
  3431: 'Intel Core 7',
  3432: 'Intel Core 5',
  3433: 'Intel Core 3',
  3436: 'Intel Xeon',
  3437: 'Intel Pentium',
  3438: 'Intel Celeron',
  3443: 'Qualcomm Snapdragon',
  3444: 'Other',
}

const RAM_MAP: Record<number, string> = {
  3462: '2 GB',
  3460: '4 GB',
  3458: '8 GB',
  3456: '12 GB',
  3455: '16 GB',
  3453: '24 GB',
  3452: '32 GB',
  3449: '64 GB',
}

const STORAGE_MAP: Record<number, string> = {
  3480: '64 GB',
  3478: '128 GB',
  3474: '256 GB',
  3470: '512 GB',
  3469: '1 TB',
  3467: '2 TB',
  3464: '4 TB',
}

const SCREEN_MAP: Record<number, string> = {
  3497: '13.3"',
  3496: '14–15.6"',
  3495: '16–17.3"',
  3494: '18"',
}

const PLATFORM_MAP: Record<number, string> = {
  1259: 'Asus ROG Ally',
  1260: 'Atari',
  1263: 'Lenovo Legion Go',
  1264: 'Nintendo 2DS',
  1265: 'Nintendo 3DS',
  1266: 'Nintendo 64',
  1267: 'Nintendo DS',
  1268: 'NES',
  1269: 'Game Boy',
  1270: 'Game Boy Advance',
  1272: 'GameCube',
  1273: 'Nintendo Switch',
  1274: 'Wii',
  1275: 'Wii U',
  1276: 'PC & Mac',
  1277: 'PlayStation 1',
  1278: 'PlayStation 2',
  1279: 'PlayStation 3',
  1280: 'PlayStation 4',
  1281: 'PlayStation 5',
  1282: 'PSP',
  1283: 'PS Vita',
  1284: 'Sega Dreamcast',
  1285: 'Sega Mega Drive',
  1286: 'Steam Deck',
  1287: 'Super Nintendo',
  1288: 'Xbox',
  1289: 'Xbox 360',
  1290: 'Xbox One',
  1291: 'Xbox Series S & X',
}

const SIM_LOCK_MAP: Record<number, string> = {
  1312: 'Network Locked',
  1313: 'Unlocked',
}

const KEYBOARD_MAP: Record<number, string> = {
  1430: 'AZERTY',
  1434: 'QWERTY',
  1435: 'QWERTZ',
  1896: 'Other',
}

const CHARGER_MAP: Record<number, string> = {
  3500: 'Yes',
  3501: 'No',
}

const INTERNAL_MEMORY_MAP: Record<number, string> = {
  1303: '32 GB',
  1304: '64 GB',
  1305: '128 GB',
  1306: '256 GB',
  1307: '512 GB',
  1308: '1 TB',
}

const LANGUAGE_MAP: Record<number, string> = {
  6435: 'English',
}

export const ATTR_DECODERS: Record<string, Record<number, string>> = {
  computer_operating_system: OS_MAP,
  computer_cpu_line: CPU_MAP,
  computer_ram: RAM_MAP,
  computer_storage_capacity: STORAGE_MAP,
  laptop_display_size: SCREEN_MAP,
  laptop_charger_included: CHARGER_MAP,
  keyboard_layout: KEYBOARD_MAP,
  computer_platform: PLATFORM_MAP,
  sim_lock: SIM_LOCK_MAP,
  internal_memory_capacity: INTERNAL_MEMORY_MAP,
  language_book: LANGUAGE_MAP,
}

export const ATTR_LABELS: Record<string, string> = {
  computer_operating_system: 'OS',
  computer_cpu_line: 'CPU',
  computer_ram: 'RAM',
  computer_storage_capacity: 'Storage',
  laptop_display_size: 'Screen',
  laptop_charger_included: 'Charger',
  keyboard_layout: 'Keyboard',
  computer_platform: 'Platform',
  sim_lock: 'SIM Lock',
  internal_memory_capacity: 'Storage',
  language_book: 'Language',
  material: 'Material',
}

/**
 * Decode a single item_attribute entry.
 * Returns human-readable value, or raw IDs joined with ", " if code is unknown.
 */
export function decodeAttribute(code: string, ids: number[]): string {
  const decoder = ATTR_DECODERS[code]
  if (decoder) {
    return ids.map((id) => decoder[id] ?? String(id)).join(', ')
  }
  return ids.join(', ')
}

/**
 * Return display label for an attribute code.
 * Falls back to code formatted: underscores → spaces, title-cased.
 */
export function attributeLabel(code: string): string {
  return (
    ATTR_LABELS[code] ??
    code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  )
}
