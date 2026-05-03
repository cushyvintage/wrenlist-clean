/**
 * Take the photoPreviews array (a mix of blob:, data:, and https: URLs)
 * and turn it into a list of inputs the AI vision endpoints can accept.
 *
 * - blob: / data: URLs are resized to <=1024px on the longest edge and
 *   re-encoded as JPEG data URLs (keeps payloads under ~1MB per image).
 * - https: URLs are passed through unchanged.
 * - Anything else is dropped (the AI route would reject it anyway).
 *
 * Used by both `identify-from-photo` and `refine-from-photo` callers — DRY
 * the canvas-resize dance instead of inlining it twice.
 */
export async function prepareImagesForAI(previews: string[], maxImages = 3): Promise<string[]> {
  const out: string[] = []
  for (const preview of previews.slice(0, maxImages)) {
    if (!preview) continue
    if (preview.startsWith('http')) {
      out.push(preview)
      continue
    }
    if (!preview.startsWith('blob:') && !preview.startsWith('data:')) continue

    try {
      const dataUrl = await resizeToDataUrl(preview)
      if (dataUrl) out.push(dataUrl)
      else console.warn('prepareImagesForAI: dropped image (no canvas context)')
    } catch (err) {
      // Single image failure shouldn't break the whole identify call —
      // skip it and let the others through, but log so dev can spot
      // CORS/CSP regressions on remote URLs.
      console.warn('prepareImagesForAI: dropped image', err)
    }
  }
  return out
}

async function resizeToDataUrl(src: string, max = 1024): Promise<string | null> {
  // Note: modern Chrome (≥81) and Safari auto-apply EXIF orientation when
  // an image is loaded into an <img> element, so the canvas drawImage call
  // below will already see the correctly-oriented bitmap. Older browsers
  // (Firefox <77) won't, but we don't support those targets.
  // HEIC handling: only Safari can natively decode HEIC. On Chrome/Firefox,
  // a HEIC upload will fail in the onerror branch and the whole image gets
  // skipped. Followup: handle this with heic2any conversion in PhotoUpload.
  const img = new Image()
  img.crossOrigin = 'anonymous'
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })

  let { width, height } = img
  if (width > max || height > max) {
    const scale = max / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.8)
}
