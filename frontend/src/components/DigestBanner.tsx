import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles, X } from 'lucide-react'
import api from '../services/api'
import type { Digest } from '../types'

export default function DigestBanner() {
  const queryClient = useQueryClient()

  const { data: digest } = useQuery<Digest | null>({
    queryKey: ['digest-latest'],
    queryFn: () =>
      api.get<Digest | null>('/digest/latest').then((r) => r.data),
    staleTime: 10 * 60_000,
  })

  const dismiss = useMutation({
    mutationFn: (id: string) => api.post(`/digest/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['digest-latest'] }),
  })

  if (!digest) return null

  const { savedCount, topArtist, topWord, communityInsight } = digest.content

  return (
    <div className="rounded-xl bg-surface-raised border border-edge p-4 flex items-start gap-3">
      <Sparkles
        size={14}
        className="text-accent flex-shrink-0 mt-0.5"
        strokeWidth={1.75}
      />

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1">
          Wochenrückblick
        </p>
        <p className="text-sm text-foreground leading-snug">
          {savedCount} {savedCount === 1 ? 'Song' : 'Songs'} diese Woche
          {topArtist && (
            <span className="text-foreground-muted"> · {topArtist}</span>
          )}
          {topWord && (
            <span className="text-foreground-muted"> · „{topWord}"</span>
          )}
        </p>
        {communityInsight && (
          <p className="text-xs text-foreground-subtle mt-1 italic line-clamp-1">
            „{communityInsight}"
          </p>
        )}
      </div>

      <button
        onClick={() => dismiss.mutate(digest.id)}
        aria-label="Schließen"
        className="flex-shrink-0 text-foreground-subtle hover:text-foreground transition-colors"
      >
        <X size={14} strokeWidth={1.75} />
      </button>
    </div>
  )
}
