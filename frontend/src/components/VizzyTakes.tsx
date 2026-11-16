import { useQuery } from '@tanstack/react-query'
import { AudioLines } from 'lucide-react'
import api from '../services/api'
import type { LyricsTakeListItem } from '../types'
import SongCard from './SongCard'
import { takeHeard, timeAgo } from '../lib/format'

const STATE: Record<LyricsTakeListItem['songLyrics'], string> = {
  none: 'noch kein Text',
  text: 'Text ohne Zeiten',
  synced: 'hat schon synchronen Text',
}

/**
 * The takes vizzy sent in, one row per song: the queue of rough lyrics
 * waiting to be looked at. Renders nothing for people who do not use vizzy.
 */
export default function VizzyTakes() {
  const { data: takes = [] } = useQuery<LyricsTakeListItem[]>({
    queryKey: ['lyrics-takes'],
    queryFn: () => api.get<LyricsTakeListItem[]>('/lyrics-takes').then((r) => r.data),
    staleTime: 30_000,
  })

  // the newest take per song; the song page shows the others
  const perSong = takes.filter(
    (t, i) => takes.findIndex((o) => o.song.spotifyId === t.song.spotifyId) === i,
  )
  if (perSong.length === 0) return null

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <AudioLines size={14} className="text-accent" strokeWidth={2} />
        Aufnahmen aus vizzy
        <span className="text-xs font-normal text-foreground-subtle">{perSong.length}</span>
      </h2>
      <p className="text-xs text-foreground-muted">
        Mitgehörte Texte mit Zeiten. Öffne einen Song, um die Aufnahme anzusehen und zu übernehmen.
      </p>
      <div className="space-y-1.5">
        {perSong.map((t) => (
          <SongCard
            key={t.id}
            imgUrl={t.song.imgUrl}
            title={t.song.title}
            artist={t.song.artist}
            spotifyId={t.song.spotifyId}
            size="sm"
            meta={
              <span className="text-[11px] text-foreground-subtle">
                {t.lineCount} Zeilen · {takeHeard(t)} · {STATE[t.songLyrics]}
              </span>
            }
            actions={
              <span className="text-[10px] text-foreground-subtle hidden sm:block">
                {timeAgo(t.recordedAt)}
              </span>
            }
          />
        ))}
      </div>
    </section>
  )
}
