import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Download, Loader2, X } from 'lucide-react'
import api from '../../services/api'
import { useNotify } from '../../stores/notificationStore'
import type { LrclibBatchResult, LrclibBatchStatus } from '../../types'

/**
 * One click, all missing lyrics.
 *
 * Runs in bounded rounds rather than one long request: LRCLib is a free service
 * that deserves pacing, and a single request covering hundreds of songs would
 * sit there for minutes with nothing to show. Each round reports back, so the
 * progress is real rather than a spinner.
 */
export default function LrclibBatch() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [running, setRunning] = useState(false)
  const [stopRequested, setStopRequested] = useState(false)
  const [saved, setSaved] = useState(0)
  const [checked, setChecked] = useState(0)
  const [lastFound, setLastFound] = useState<string[]>([])

  const { data: status } = useQuery<LrclibBatchStatus>({
    queryKey: ['lrclib-batch-status'],
    queryFn: () =>
      api.get<LrclibBatchStatus>('/songs/lyrics/lrclib-batch').then((r) => r.data),
    staleTime: 60_000,
  })

  async function run() {
    setRunning(true)
    setStopRequested(false)
    setSaved(0)
    setChecked(0)
    setLastFound([])

    let totalSaved = 0
    let totalChecked = 0
    let stop = false

    try {
      // Keep going until nothing is left. `stopRequested` is read through a DOM
      // check rather than state, because state inside this loop would be stale.
      for (let round = 0; round < 100 && !stop; round++) {
        const { data } = await api.post<LrclibBatchResult>(
          '/songs/lyrics/lrclib-batch',
        )
        totalSaved += data.saved
        totalChecked += data.checked
        setSaved(totalSaved)
        setChecked(totalChecked)
        setLastFound(
          data.results.filter((r) => r.found).map((r) => `${r.artist} – ${r.title}`),
        )

        // Stop on no progress, not just on `remaining === 0`: a song LRCLib
        // simply does not have stays "missing" forever, so waiting for the
        // counter to reach zero would re-query the same misses in a loop.
        if (data.checked === 0 || data.saved === 0 || data.remaining === 0) break
        stop = document.body.dataset.lrclibStop === '1'
      }

      await queryClient.invalidateQueries({ queryKey: ['lrclib-batch-status'] })
      await queryClient.invalidateQueries({ queryKey: ['analytics-lrclib'] })
      await queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] })

      notify.success(
        totalSaved > 0
          ? `${totalSaved} von ${totalChecked} Songs haben jetzt Lyrics`
          : `Für die ${totalChecked} geprüften Songs hat LRCLib nichts gefunden`,
      )
    } catch {
      notify.error('Die Suche wurde abgebrochen — versuch es später nochmal')
    } finally {
      setRunning(false)
      delete document.body.dataset.lrclibStop
    }
  }

  if (!status || status.missing === 0) {
    return status ? (
      <p className="text-xs text-foreground-subtle">
        Alle {status.total} Songs haben Lyrics.
      </p>
    ) : null
  }

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => void run()}
          disabled={running}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-accent text-black
                     text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {running ? (
            <Loader2 size={13} strokeWidth={2.25} className="animate-spin" />
          ) : (
            <Download size={13} strokeWidth={2.25} />
          )}
          {running
            ? `${checked} geprüft, ${saved} gefunden`
            : status.missing === 1
              ? 'Lyrics für 1 Song suchen'
              : `Lyrics für ${status.missing} Songs suchen`}
        </button>

        {running && (
          <button
            onClick={() => {
              document.body.dataset.lrclibStop = '1'
              setStopRequested(true)
            }}
            className="flex items-center gap-1 px-2.5 py-2 min-h-[40px] rounded-lg border border-edge
                       text-xs text-foreground-muted hover:text-foreground active:bg-surface-overlay transition-colors"
          >
            <X size={12} strokeWidth={2} />
            {stopRequested ? 'Stoppt…' : 'Stoppen'}
          </button>
        )}
      </div>

      {lastFound.length > 0 && (
        <ul className="space-y-0.5">
          {lastFound.slice(0, 4).map((label) => (
            <li
              key={label}
              className="flex items-center gap-1.5 text-[11px] text-foreground-subtle"
            >
              <Check size={10} strokeWidth={2.5} className="text-accent flex-shrink-0" />
              <span className="truncate">{label}</span>
            </li>
          ))}
        </ul>
      )}

      {!running && (
        <p className="text-[11px] text-foreground-subtle">
          Sucht bei LRCLib nach allen Songs ohne Text und speichert, was es
          findet. Nichts wird überschrieben.
        </p>
      )}
    </div>
  )
}
