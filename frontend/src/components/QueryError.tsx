import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { CloudOff, RotateCw } from 'lucide-react'
import { describeError } from '../lib/errors'

/**
 * Retry resets the query rather than refetching it: a paused query ignores
 * `refetch()` — it is waiting for a connectivity event that never arrives,
 * because the browser was never offline, only the backend was. Resetting drops
 * that state and starts a clean fetch.
 */
export default function QueryError({
  queryKey,
  message = 'Konnte nicht geladen werden. Prüf deine Verbindung.',
}: {
  queryKey: QueryKey
  message?: string
}) {
  const queryClient = useQueryClient()
  // Internal tool: show what actually failed, not just that something did.
  const error = queryClient.getQueryState(queryKey)?.error

  return (
    <div className="rounded-xl bg-surface-raised border border-edge px-4 py-8 flex flex-col items-center text-center gap-3">
      <CloudOff size={22} strokeWidth={1.5} className="text-foreground-subtle" />
      <p className="text-sm text-foreground-muted max-w-[36ch]">{message}</p>
      {error && (
        <p className="text-[11px] font-mono text-foreground-subtle max-w-full break-words select-all">
          {describeError(error)}
        </p>
      )}
      <button
        onClick={() => void queryClient.resetQueries({ queryKey })}
        className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg bg-accent text-black
                   text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
      >
        <RotateCw size={13} strokeWidth={2.25} />
        Erneut versuchen
      </button>
    </div>
  )
}
