export type GrayscaleMap = {
  previewUrl: string
  values: Uint8Array
}

export type GrayscaleProcessor = {
  createMap: (source: CanvasImageSource) => GrayscaleMap
  read: (source: CanvasImageSource, mirror?: boolean) => Uint8Array
}

export function createGrayscaleProcessor(size: number): GrayscaleProcessor {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const canvasContext = canvas.getContext('2d', { willReadFrequently: true })

  if (!canvasContext) {
    throw new Error('Canvas 2D is not available in this browser.')
  }

  const context = canvasContext
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'

  function read(source: CanvasImageSource, mirror = false) {
    context.save()
    context.setTransform(mirror ? -1 : 1, 0, 0, 1, mirror ? size : 0, 0)
    context.drawImage(source, 0, 0, size, size)
    context.restore()

    const imageData = context.getImageData(0, 0, size, size)
    const rgba = imageData.data
    const values = new Uint8Array(size * size)

    for (let index = 0; index < values.length; index += 1) {
      const offset = index * 4
      const grayscale = Math.round(
        rgba[offset] * 0.2126 +
          rgba[offset + 1] * 0.7152 +
          rgba[offset + 2] * 0.0722,
      )

      values[index] = grayscale
      rgba[offset] = grayscale
      rgba[offset + 1] = grayscale
      rgba[offset + 2] = grayscale
      rgba[offset + 3] = 255
    }

    context.putImageData(imageData, 0, 0)

    return values
  }

  return {
    read,
    createMap(source) {
      return {
        values: read(source),
        previewUrl: canvas.toDataURL('image/png'),
      }
    },
  }
}

/**
 * Uses only browser-built-in APIs to decode, resize and grayscale an image.
 * No image-processing package or server round-trip is involved.
 */
export async function createGrayscaleMap(
  source: Blob,
  size: number,
): Promise<GrayscaleMap> {
  const bitmap = await createImageBitmap(source)
  const processor = createGrayscaleProcessor(size)

  try {
    return processor.createMap(bitmap)
  } finally {
    bitmap.close()
  }
}
