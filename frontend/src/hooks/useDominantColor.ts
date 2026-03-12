import { useState, useEffect } from 'react'
import ColorThief from 'colorthief'

const thief = new ColorThief()
const colorCache = new Map<string, [number, number, number]>()

export function useDominantColor(
  imgUrl: string | null | undefined,
): [number, number, number] | null {
  const [color, setColor] = useState<[number, number, number] | null>(null)

  useEffect(() => {
    if (!imgUrl) {
      setColor(null)
      return
    }
    if (colorCache.has(imgUrl)) {
      setColor(colorCache.get(imgUrl)!)
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const rgb = thief.getColor(img) as [number, number, number]
        colorCache.set(imgUrl, rgb)
        setColor(rgb)
      } catch {
        setColor(null)
      }
    }
    img.onerror = () => setColor(null)
    img.src = imgUrl
  }, [imgUrl])

  return color
}
