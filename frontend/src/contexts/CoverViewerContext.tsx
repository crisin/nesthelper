import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

export interface CoverInfo {
  src: string
  track?: string
  artist?: string
}

type OpenCover = (info: CoverInfo) => void

// ── Context ────────────────────────────────────────────────────────────────

const CoverViewerContext = createContext<OpenCover>(() => {})

export const useCoverViewer = () => useContext(CoverViewerContext)

// ── Provider + Overlay ─────────────────────────────────────────────────────

export function CoverViewerProvider({ children }: { children: ReactNode }) {
  const [cover, setCover]   = useState<CoverInfo | null>(null)
  const [visible, setVisible] = useState(false)

  const openCover = useCallback((info: CoverInfo) => {
    setCover(info)
    // Two rAFs: first renders the DOM at opacity-0, second triggers the transition
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  const closeCover = useCallback(() => {
    setVisible(false)
    // Clear cover after the exit transition (250ms max)
    setTimeout(() => setCover(null), 260)
  }, [])

  // Escape key
  useEffect(() => {
    if (!cover) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closeCover() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cover, closeCover])

  return (
    <CoverViewerContext.Provider value={openCover}>
      {children}

      {cover && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-8"
          style={{
            backgroundColor: visible ? 'rgba(0,0,0,0.90)' : 'rgba(0,0,0,0)',
            transition: 'background-color 0.2s ease',
          }}
          onClick={closeCover}
        >
          {/* Close button */}
          <button
            onClick={closeCover}
            aria-label="Close cover view"
            className="absolute top-4 right-4 w-10 h-10 rounded-full
                       bg-white/10 hover:bg-white/20
                       flex items-center justify-center text-white transition-colors"
          >
            <X size={18} strokeWidth={2} />
          </button>

          {/* Cover + metadata */}
          <div
            className="flex flex-col items-center gap-5"
            style={{
              transform: visible ? 'scale(1)' : 'scale(0.86)',
              opacity:   visible ? 1 : 0,
              transition: visible
                ? 'transform 320ms cubic-bezier(0.34,1.56,0.64,1), opacity 200ms ease'
                : 'transform 220ms ease-in, opacity 200ms ease-in',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={cover.src}
              alt={cover.track ?? 'Cover'}
              className="rounded-2xl shadow-2xl object-cover"
              style={{
                width:  'min(85vw, 600px)',
                height: 'min(85vw, 600px)',
              }}
            />

            {(cover.track || cover.artist) && (
              <div className="text-center px-4 max-w-sm">
                {cover.track && (
                  <p className="text-white font-semibold text-base leading-snug">
                    {cover.track}
                  </p>
                )}
                {cover.artist && (
                  <p className="text-white/55 text-sm mt-1">{cover.artist}</p>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </CoverViewerContext.Provider>
  )
}
