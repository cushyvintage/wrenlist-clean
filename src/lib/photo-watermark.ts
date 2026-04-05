/**
 * Browser-side photo watermark using canvas text rendering
 * No external dependencies — uses native Canvas API
 */

export interface WatermarkOptions {
  position: 'bottom-right' | 'bottom-left' | 'center'
  opacity: number
  fontSize: number
}

const DEFAULT_OPTIONS: WatermarkOptions = {
  position: 'bottom-right',
  opacity: 0.3,
  fontSize: 0, // 0 means auto-scale relative to image
}

/**
 * Add a semi-transparent text watermark to an image
 * Returns a new PNG File with the watermark applied
 */
export async function addWatermark(
  imageFile: File,
  text: string,
  options?: Partial<WatermarkOptions>
): Promise<File> {
  const opts: WatermarkOptions = { ...DEFAULT_OPTIONS, ...options }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const img = new Image()

        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          // Draw original image
          ctx.drawImage(img, 0, 0)

          // Calculate font size: use provided or auto-scale to ~3% of shortest dimension
          const shortSide = Math.min(canvas.width, canvas.height)
          const fontSize = opts.fontSize > 0
            ? opts.fontSize
            : Math.max(14, Math.round(shortSide * 0.03))

          ctx.font = `${fontSize}px sans-serif`
          ctx.globalAlpha = opts.opacity

          const metrics = ctx.measureText(text)
          const textWidth = metrics.width
          const textHeight = fontSize

          // Padding from edges
          const pad = Math.round(fontSize * 0.8)

          let x: number
          let y: number

          switch (opts.position) {
            case 'bottom-left':
              x = pad
              y = canvas.height - pad
              break
            case 'center':
              x = (canvas.width - textWidth) / 2
              y = (canvas.height + textHeight) / 2
              break
            case 'bottom-right':
            default:
              x = canvas.width - textWidth - pad
              y = canvas.height - pad
              break
          }

          // Dark shadow for contrast on light backgrounds
          ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
          ctx.shadowBlur = Math.max(2, Math.round(fontSize * 0.15))
          ctx.shadowOffsetX = 1
          ctx.shadowOffsetY = 1

          // White text
          ctx.fillStyle = 'white'
          ctx.fillText(text, x, y)

          // Reset alpha
          ctx.globalAlpha = 1.0

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
