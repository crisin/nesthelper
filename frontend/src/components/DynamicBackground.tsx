import { useEffect, useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { SpotifyCurrentlyPlayingResponse } from '../types'
import { useVisualStore } from '../stores/visualStore'
import { useAudioFeatures } from '../hooks/useAudioFeatures'
import { useDominantColor } from '../hooks/useDominantColor'

// Desktop-only — return null immediately on mobile to avoid any rendering cost
const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches

export default function DynamicBackground({ page }: { page: string }) {
  const { enabled, pages, mode, blurAmount, dimAmount, showVisualizer, visualizerStyle } =
    useVisualStore()
  const qc = useQueryClient()

  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [spotifyId, setSpotifyId] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const prevIdRef = useRef<string | null>(null)

  // Early-out: mobile or disabled
  if (!isDesktop || !enabled || !pages[page]) return null

  // Poll the React Query cache every 2s — no extra network request
  useEffect(() => {
    const tick = () => {
      const track = qc.getQueryData<SpotifyCurrentlyPlayingResponse | null>([
        'spotify-current-track',
      ])
      const id = track?.item?.id ?? null
      const url = track?.item?.album?.images?.[0]?.url ?? null

      if (id !== prevIdRef.current) {
        prevIdRef.current = id
        // Fade out, swap image, fade back in
        setVisible(false)
        setTimeout(() => {
          setImgUrl(url)
          setSpotifyId(id)
          setVisible(!!id)
        }, 400)
      }
    }
    tick()
    const timer = setInterval(tick, 2000)
    return () => clearInterval(timer)
  }, [qc])

  const { data: features } = useAudioFeatures(spotifyId)
  const dominantColor = useDominantColor(imgUrl)

  // Animation timing from audio features
  const tempo = features?.tempo ?? 120
  const energy = features?.energy ?? 0.5
  const pulseDuration = Math.round(60000 / tempo)
  const pulseScale = 1 + energy * 0.025
  const ambientOpacity = 0.15 + energy * 0.15

  const animStyle: React.CSSProperties =
    showVisualizer && visualizerStyle === 'pulse'
      ? { animation: `bg-pulse ${pulseDuration}ms ease-in-out infinite` }
      : showVisualizer && visualizerStyle === 'breathe'
        ? { animation: `bg-breathe ${pulseDuration * 2}ms ease-in-out infinite` }
        : {}

  const rgb = dominantColor ? dominantColor.join(',') : '0,0,0'

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{
        zIndex: -1,
        opacity: visible ? 1 : 0,
        transition: 'opacity 1.2s ease',
        // CSS variables for future animation editor
        ['--bg-blur' as string]: `${blurAmount}px`,
        ['--bg-dim' as string]: dimAmount,
        ['--bg-pulse-scale' as string]: pulseScale,
        ['--bg-pulse-duration' as string]: `${pulseDuration}ms`,
        ['--bg-ambient-opacity' as string]: ambientOpacity,
      }}
    >
      {/* Album art blur layer */}
      {(mode === 'blur' || mode === 'both') && imgUrl && (
        <img
          src={imgUrl}
          crossOrigin="anonymous"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: `blur(${blurAmount}px)`,
            opacity: 1 - dimAmount,
            transform: 'scale(1.1)',
          }}
        />
      )}

      {/* Surface overlay to ensure text readability */}
      <div className="absolute inset-0 bg-surface/70" />

      {/* Ambient color radial glow */}
      {(mode === 'ambient' || mode === 'both') && dominantColor && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 20%, rgba(${rgb},${ambientOpacity}), transparent 65%)`,
          }}
        />
      )}

      {/* Visualizer: inset box-shadow pulse ring driven by BPM */}
      {showVisualizer && dominantColor && (
        <div
          className="absolute inset-0"
          style={{
            boxShadow: `inset 0 0 140px rgba(${rgb}, 0.25)`,
            ...animStyle,
          }}
        />
      )}
    </div>
  )
}
