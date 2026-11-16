import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AudioLines, Check, Loader2, Trash2, X } from 'lucide-react'
import api from '../services/api'
import type { LyricsTake, SongLyrics } from '../types'
import { formatDate, formatMs, takeHeard } from '../lib/format'

/**
 * A take from vizzy for this song: what its live transcription heard, with
 * song times. Rough material — it becomes a lyrics draft only when the user
 * says so, and only while the song has no text of its own.
 */
export default function VizzyTakePanel({
  spotifyId,
  takes,
  lyrics,
  onClose,
}: {
  spotifyId: string
  takes: LyricsTake[]
  lyrics: SongLyrics | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [index, setIndex] = useState(0)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const take = takes[Math.min(index, takes.length - 1)]
  const hasText = !!lyrics?.rawText.trim()
  const hasTimes = !!lyrics?.lines.some((l) => l.timestampMs != null)

  // Same two steps as the LRCLib import: the text first, then the times onto
  // the lines it created.
  const adopt = useMutation({
    mutationFn: async () => {
      const rawText = take.lines.map((l) => l.text).join('\n')
      const saved = await api
        .put<SongLyrics>(`/songs/${spotifyId}/lyrics`, { rawText, version: lyrics?.version })
        .then((r) => r.data)
      const timestamps = take.lines
        .map((l, i) => ({ id: saved.lines[i]?.id, timestampMs: l.startMs }))
        .filter((l): l is { id: string; timestampMs: number } => !!l.id)
      if (timestamps.length > 0) {
        await api.patch(`/songs/${spotifyId}/lyrics/timestamps`, { lines: timestamps })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lyrics', spotifyId] })
      queryClient.invalidateQueries({ queryKey: ['lyrics-takes'] })
      onClose()
    },
  })

  const discard = useMutation({
    mutationFn: () => api.delete(`/lyrics-takes/${take.id}`),
    onSuccess: () => {
      setConfirmDiscard(false)
      setIndex(0)
      queryClient.invalidateQueries({ queryKey: ['lyrics-takes'] })
      if (takes.length <= 1) onClose()
    },
  })

  if (!take) return null

  return (
    <div className="rounded-xl border border-edge bg-surface-raised overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-edge bg-surface">
        <AudioLines size={13} className="text-accent flex-shrink-0" strokeWidth={2} />
        <span className="text-xs font-semibold text-foreground flex-1">Aufnahme aus vizzy</span>
        <button
          onClick={onClose}
          className="text-foreground-subtle hover:text-foreground transition-colors"
          aria-label="Schließen"
        >
          <X size={13} strokeWidth={2} />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {takes.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {takes.map((t, i) => (
              <button
                key={t.id}
                onClick={() => { setIndex(i); setConfirmDiscard(false) }}
                className={[
                  'px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors',
                  t.id === take.id
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'border-edge text-foreground-subtle hover:text-foreground-muted',
                ].join(' ')}
              >
                {formatDate(t.recordedAt)} · {takeHeard(t)}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">
              Mitgehört am {formatDate(take.recordedAt)}
            </p>
            <p className="text-[11px] text-foreground-muted">
              {take.lines.length} Zeilen · {takeHeard(take)}
              {take.clock !== 'media' && ' · Zeiten nur grob'}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-foreground-muted leading-relaxed">
          Das hat vizzy beim Hören verstanden — ein grober Entwurf, mit Hörfehlern und Zeiten, die um
          etwa eine Sekunde danebenliegen können.
        </p>

        <div className="rounded-lg bg-surface border border-edge p-3 space-y-1 max-h-64 overflow-y-auto">
          {take.lines.map((line, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="text-[9px] font-mono text-foreground-subtle flex-shrink-0 tabular-nums">
                {formatMs(line.startMs)}
              </span>
              <span className="text-xs text-foreground leading-relaxed">{line.text}</span>
            </div>
          ))}
        </div>

        {hasText && (
          <p className="text-[11px] text-foreground-muted leading-relaxed">
            {hasTimes
              ? 'Der Song hat schon Text mit Zeiten. Die Aufnahme ist nur zum Vergleichen da.'
              : 'Der Song hat schon Text. Übernehmen würde ihn ersetzen, deshalb geht das hier nicht — die Zeiten aus der Aufnahme auf den vorhandenen Text zu legen, kommt als nächster Schritt.'}
          </p>
        )}

        {adopt.isError && (
          <p className="text-[11px] text-red-400" role="alert">
            Übernehmen hat nicht geklappt. Lade die Seite neu und versuch es noch einmal.
          </p>
        )}
        {discard.isError && (
          <p className="text-[11px] text-red-400" role="alert">
            Verwerfen hat nicht geklappt.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {!hasText && (
            <button
              onClick={() => adopt.mutate()}
              disabled={adopt.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium
                         hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {adopt.isPending
                ? <Loader2 size={12} className="animate-spin" />
                : <Check size={12} strokeWidth={2.5} />}
              Als Entwurf übernehmen
            </button>
          )}
          {confirmDiscard ? (
            <>
              <button
                onClick={() => discard.mutate()}
                disabled={discard.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-400/40 text-red-400 text-xs font-medium
                           hover:bg-red-400/10 transition-colors disabled:opacity-50"
              >
                {discard.isPending && <Loader2 size={12} className="animate-spin" />}
                Aufnahme löschen
              </button>
              <button
                onClick={() => setConfirmDiscard(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-foreground-subtle hover:text-foreground-muted transition-colors"
              >
                Behalten
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDiscard(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge text-xs text-foreground-subtle
                         hover:text-foreground-muted transition-colors"
            >
              <Trash2 size={12} strokeWidth={2} />
              Verwerfen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
