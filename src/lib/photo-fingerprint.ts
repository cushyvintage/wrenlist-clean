/**
 * Perceptual photo fingerprinting using canvas-based average hash.
 * Resizes to 8x8, converts to grayscale, produces a 64-char hex string.
 * Catches exact duplicates and near-duplicates without external deps.
 */

const HASH_SIZE = 8

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for fingerprinting'))
    }
    img.src = url
  })
}

export async function getPhotoFingerprint(file: File): Promise<string> {
  const img = await loadImage(file)

  const canvas = document.createElement('canvas')
  canvas.width = HASH_SIZE
  canvas.height = HASH_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  // Draw image scaled down to 8x8
  ctx.drawImage(img, 0, 0, HASH_SIZE, HASH_SIZE)
  const { data } = ctx.getImageData(0, 0, HASH_SIZE, HASH_SIZE)

  // Convert to grayscale values
  const grays: number[] = []
  for (let i = 0; i < data.length; i += 4) {
    // ITU-R BT.601 luma
    const gray = Math.round(0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!)
    grays.push(gray)
  }

  // Average hash: compare each pixel to the mean
  const mean = grays.reduce((s, v) => s + v, 0) / grays.length
  let hash = ''
  for (const g of grays) {
    hash += g >= mean ? '1' : '0'
  }

  // Convert binary string to hex for compact storage
  let hex = ''
  for (let i = 0; i < hash.length; i += 4) {
    hex += parseInt(hash.slice(i, i + 4), 2).toString(16)
  }

  return hex
}

/** Hamming distance between two hex fingerprints (number of differing bits). */
export function fingerprintDistance(a: string, b: string): number {
  if (a.length !== b.length) return Infinity

  let distance = 0
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16)
    // Count set bits in xor
    let bits = xor
    while (bits) {
      distance += bits & 1
      bits >>= 1
    }
  }
  return distance
}

/** Threshold: fingerprints within this hamming distance are considered duplicates. */
export const DUPLICATE_THRESHOLD = 10
