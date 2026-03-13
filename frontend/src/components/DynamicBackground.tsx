import { useEffect, useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { SpotifyCurrentlyPlayingResponse } from '../types'
import { useVisualStore } from '../stores/visualStore'
import { useAudioFeatures } from '../hooks/useAudioFeatures'
import { useDominantColor } from '../hooks/useDominantColor'

// Desktop-only — skip all rendering on mobile
const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches

export default function DynamicBackground({ pageKey }: { pageKey: string | null }) {
  const { enabled, pages, mode, blurAmount, dimAmount, showVisualizer, visualizerStyle } =
    useVisualStore()
  const qc = useQueryClient()

  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [spotifyId, setSpotifyId] = useState<string | null>(null)
  const [trackVisible, setTrackVisible] = useState(false)
  const prevIdRef = useRef<string | null>(null)

  const pageEnabled = pageKey ? !!pages[pageKey] : false
  const active = isDesktop && enabled && pageEnabled

  // Poll the React Query cache — runs whenever globally enabled on desktop.
  // Keeps imgUrl current even on disabled pages so switching to an enabled page
  // shows the correct art immediately without a flash.
  useEffect(() => {
    if (!isDesktop || !enabled) return
    const tick = () => {
      const track = qc.getQueryData<SpotifyCurrentlyPlayingResponse | null>([
        'spotify-current-track',
      ])
      const id = track?.item?.id ?? null
      const url = track?.item?.album?.images?.[0]?.url ?? null

      if (id !== prevIdRef.current) {
        prevIdRef.current = id
        // Cross-fade: fade out → swap → fade in
        setTrackVisible(false)
        setTimeout(() => {
          setImgUrl(url)
          setSpotifyId(id)
          setTrackVisible(!!id)
        }, 400)
      }
    }
    tick()
    const timer = setInterval(tick, 2000)
    return () => clearInterval(timer)
  }, [qc, enabled])

  const { data: features } = useAudioFeatures(spotifyId)
  const dominantColor = useDominantColor(imgUrl)

  if (!isDesktop) return null

  // Opacity-driven show/hide — component stays mounted across navigations,
  // eliminating flicker. Transitions handle both track changes and page toggles.
  const show = active && trackVisible

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
        opacity: show ? 1 : 0,
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
