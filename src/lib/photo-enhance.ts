/**
 * Browser-side auto-enhance for product photos.
 * Applies brightness, contrast and saturation adjustments using canvas.
 * No external dependencies.
 */

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
      reject(new Error('Failed to load image for enhancement'))
    }
    img.src = url
  })
}

/**
 * Clamp a value between 0 and 255.
 */
function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v)
}

/**
 * Auto-enhance a photo: brighten, boost contrast and saturation.
 * Returns a new File (JPEG) with the adjustments applied.
 */
export async function autoEnhance(file: File): Promise<File> {
  const img = await loadImage(file)

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { data } = imageData

  // 1. Compute average luminance to decide brightness boost
  let totalLum = 0
  const pixelCount = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    totalLum += 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!
  }
  const avgLum = totalLum / pixelCount

  // Brightness offset: push towards ~135 midpoint
  const brightnessOffset = Math.round((135 - avgLum) * 0.3)

  // Contrast factor: mild boost (1.1)
  const contrastFactor = 1.1

  // Saturation boost factor
  const satBoost = 1.15

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]!
    let g = data[i + 1]!
    let b = data[i + 2]!

    // Brightness
    r += brightnessOffset
    g += brightnessOffset
    b += brightnessOffset

    // Contrast around 128
    r = (r - 128) * contrastFactor + 128
    g = (g - 128) * contrastFactor + 128
    b = (b - 128) * contrastFactor + 128

    // Saturation boost (desaturate to gray then lerp back beyond)
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    r = gray + (r - gray) * satBoost
    g = gray + (g - gray) * satBoost
    b = gray + (b - gray) * satBoost

    data[i] = clamp(r)
    data[i + 1] = clamp(g)
    data[i + 2] = clamp(b)
  }

  ctx.putImageData(imageData, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed'))
          return
        }
        const name = file.name.replace(/\.[^.]+$/, '.jpg')
        resolve(new File([blob], name, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.92
    )
  })
}
