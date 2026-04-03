/**
 * Browser-side background removal using canvas color distance algorithm
 * No API key required — runs entirely client-side
 * Labelled as Beta — works best for light, uniform backgrounds (typical product photos)
 */

/**
 * Remove background from an image using canvas-based color distance detection
 * Samples background colour from image edges, removes pixels within distance threshold
 * Returns a PNG file with transparent background
 */
export async function removeBackground(imageFile: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (event) => {
      try {
        const img = new Image()

        img.onload = async () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data

          // Sample background colour from image edges (corners + centre edges)
          const samplePoints: [number, number][] = [
            [0, 0],
            [canvas.width - 1, 0],
            [0, canvas.height - 1],
            [canvas.width - 1, canvas.height - 1],
            [Math.floor(canvas.width / 2), 0],
            [0, Math.floor(canvas.height / 2)],
            [canvas.width - 1, Math.floor(canvas.height / 2)],
            [Math.floor(canvas.width / 2), canvas.height - 1],
          ]

          let totalR = 0
          let totalG = 0
          let totalB = 0

          for (const [x, y] of samplePoints) {
            const idx = (y * canvas.width + x) * 4
            totalR += data[idx]!
            totalG += data[idx + 1]!
            totalB += data[idx + 2]!
          }

          const bgR = totalR / samplePoints.length
          const bgG = totalG / samplePoints.length
          const bgB = totalB / samplePoints.length

          // Process pixels: remove those close to background colour
          const THRESHOLD = 45 // colour distance threshold (0-442 max)

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i]!
            const g = data[i + 1]!
            const b = data[i + 2]!

            // Euclidean distance in RGB space
            const dist = Math.sqrt(
              Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2)
            )

            // If pixel is close to background colour, make transparent
            if (dist < THRESHOLD) {
              data[i + 3] = 0 // alpha channel
            }
          }

          ctx.putImageData(imageData, 0, 0)

          // Convert canvas to transparent PNG
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to convert canvas to blob'))
                return
              }

              const fileName = imageFile.name.replace(/\.[^.]+$/, '.png')
              const resultFile = new File([blob], fileName, { type: 'image/png' })
              resolve(resultFile)
            },
            'image/png'
          )
        }

        img.onerror = () => {
          reject(new Error('Failed to load image'))
        }

        img.src = event.target?.result as string
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(imageFile)
  })
}
