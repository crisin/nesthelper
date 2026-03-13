/* eslint-disable react-hooks/set-state-in-effect */
import * as colorthief from "colorthief";
import { useState, useEffect } from "react";

const colorCache = new Map<string, [number, number, number]>();

export function useDominantColor(
  imgUrl: string | null | undefined,
): [number, number, number] | null {
  const [color, setColor] = useState<[number, number, number] | null>(null);

  useEffect(() => {
    if (!imgUrl) {
      setColor(null);
      return;
    }
    if (colorCache.has(imgUrl)) {
      setColor(colorCache.get(imgUrl)!);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const rgb = colorthief.getColorSync(img) as [number, number, number];
        colorCache.set(imgUrl, rgb);
        setColor(rgb);
      } catch {
        setColor(null);
      }
    };
    img.onerror = () => setColor(null);
    img.src = imgUrl;
  }, [imgUrl]);

  return color;
}
