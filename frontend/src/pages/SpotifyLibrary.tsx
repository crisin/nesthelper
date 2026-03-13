import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Music, Check, Plus, ChevronDown, ChevronRight, Loader2, ListMusic, Heart } from 'lucide-react'
import api from '../services/api'
import type {
  SpotifyLibraryTrack,
  SpotifyLibraryPage,
  SpotifyPlaylist,
  SpotifyPlaylistTrackItem,
  SpotifySavedTrackItem,
  Song,
} from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function TrackRow({
  track,
  addedSpotifyIds,
  onImport,
  isPending,
}: {
  track: SpotifyLibraryTrack
  addedSpotifyIds: Set<string>
  onImport: (tracks: SpotifyLibraryTrack[]) => void
  isPending: boolean
}) {
  const { data: dbSong } = useQuery<Song | null>({
    queryKey: ['song', track.id],
    queryFn: () =>
      api.get<Song>(`/songs/${track.id}`).then((r) => r.data).catch(() => null),
    staleTime: 60_000,
    retry: false,
  })

  const inDb = !!dbSong || addedSpotifyIds.has(track.id)
  const imgUrl = track.album.images[0]?.url
  const artists = track.artists.map((a) => a.name).join(', ')

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-surface-overlay/50 transition-colors group">
      {imgUrl ? (
        <img src={imgUrl} alt={track.name} className="w-9 h-9 rounded-md object-cover flex-shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-md bg-surface-overlay flex items-center justify-center flex-shrink-0">
          <Music size={14} className="text-foreground-subtle" strokeWidth={1.5} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-tight">{track.name}</p>
        <p className="text-[11px] text-foreground-muted truncate mt-0.5">{artists}</p>
      </div>

      <button
        onClick={() => !inDb && onImport([track])}
        disabled={inDb || isPending}
        className={[
          'flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-all',
          inDb
            ? 'bg-accent/10 text-accent cursor-default'
            : 'bg-surface-overlay text-foreground-muted hover:bg-accent hover:text-black opacity-0 group-hover:opacity-100',
        ].join(' ')}
        title={inDb ? 'Bereits gespeichert' : 'Zu Favoriten hinzufügen'}
      >
        {inDb ? <Check size={12} strokeWidth={2.5} /> : <Plus size={12} strokeWidth={2.5} />}
      </button>
    </div>
  )
}

// ─── Liked Songs tab ──────────────────────────────────────────────────────────

function LikedSongsTab({
  addedSpotifyIds,
  onImport,
  importPending,
}: {
  addedSpotifyIds: Set<string>
  onImport: (tracks: SpotifyLibraryTrack[]) => void
  importPending: boolean
}) {
  const [offset, setOffset] = useState(0)
  const limit = 50

  const { data, isLoading, isFetching } = useQuery<SpotifyLibraryPage<SpotifySavedTrackItem>>({
    queryKey: ['spotify-liked', offset],
    queryFn: () =>
      api
        .get<SpotifyLibraryPage<SpotifySavedTrackItem>>(`/spotify/library/tracks?offset=${offset}&limit=${limit}`)
        .then((r) => r.data),
    staleTime: 2 * 60_000,
  })

  const tracks = data?.items.map((i) => i.track) ?? []
  const total = data?.total ?? 0
  const pages = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit) + 1

  const importAll = () => onImport(tracks)

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-xs text-foreground-muted">
          {total > 0 ? `${total} Songs` : ''}
        </p>
        {tracks.length > 0 && (
          <button
            onClick={importAll}
            disabled={importPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-black text-xs font-semibold
                       hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {importPending ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} strokeWidth={2.5} />}
            Alle importieren
          </button>
        )}
      </div>

      {/* Track list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-foreground-subtle" />
        </div>
      ) : tracks.length === 0 ? (
        <p className="text-sm text-foreground-muted text-center py-12">Keine Liked Songs gefunden.</p>
      ) : (
        <div className="rounded-xl border border-edge bg-surface-raised overflow-hidden divide-y divide-edge/50">
          {tracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              addedSpotifyIds={addedSpotifyIds}
              onImport={onImport}
              isPending={importPending}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0 || isFetching}
            className="px-3 py-1.5 rounded-lg border border-edge text-xs text-foreground-muted
                       hover:text-foreground disabled:opacity-40 transition-colors"
          >
            Zurück
          </button>
          <span className="text-xs text-foreground-muted tabular-nums">
            {currentPage} / {pages}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total || isFetching}
            className="px-3 py-1.5 rounded-lg border border-edge text-xs text-foreground-muted
                       hover:text-foreground disabled:opacity-40 transition-colors"
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Playlist tracks expand ────────────────────────────────────────────────────

function PlaylistTracks({
  playlistId,
  addedSpotifyIds,
  onImport,
  importPending,
}: {
  playlistId: string
  addedSpotifyIds: Set<string>
  onImport: (tracks: SpotifyLibraryTrack[]) => void
  importPending: boolean
}) {
  const [offset, setOffset] = useState(0)
  const limit = 50

  const { data, isLoading, isFetching } = useQuery<SpotifyLibraryPage<SpotifyPlaylistTrackItem>>({
    queryKey: ['spotify-playlist-tracks', playlistId, offset],
    queryFn: () =>
      api
        .get<SpotifyLibraryPage<SpotifyPlaylistTrackItem>>(
          `/spotify/library/playlists/${playlistId}/tracks?offset=${offset}&limit=${limit}`,
        )
        .then((r) => r.data),
    staleTime: 2 * 60_000,
  })

  const items = data?.items.filter((i) => i.track != null) ?? []
  const tracks = items.map((i) => i.track as SpotifyLibraryTrack)
  const total = data?.total ?? 0
  const pages = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit) + 1

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin text-foreground-subtle" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Import all for this page */}
      {tracks.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[11px] text-foreground-muted">{total} Songs</span>
          <button
            onClick={() => onImport(tracks)}
            disabled={importPending}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent text-black text-[11px] font-semibold
                       hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {importPending ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} strokeWidth={2.5} />}
            Alle importieren
          </button>
        </div>
      )}

      {tracks.map((track) => (
        <TrackRow
          key={track.id}
          track={track}
          addedSpotifyIds={addedSpotifyIds}
          onImport={onImport}
          isPending={importPending}
        />
      ))}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0 || isFetching}
            className="px-2.5 py-1 rounded-lg border border-edge text-[11px] text-foreground-muted
                       hover:text-foreground disabled:opacity-40 transition-colors"
          >
            Zurück
          </button>
          <span className="text-[11px] text-foreground-muted">{currentPage} / {pages}</span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total || isFetching}
            className="px-2.5 py-1 rounded-lg border border-edge text-[11px] text-foreground-muted
                       hover:text-foreground disabled:opacity-40 transition-colors"
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Playlists tab ────────────────────────────────────────────────────────────

function PlaylistsTab({
  addedSpotifyIds,
  onImport,
  importPending,
}: {
  addedSpotifyIds: Set<string>
  onImport: (tracks: SpotifyLibraryTrack[]) => void
  importPending: boolean
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const limit = 50

  const { data, isLoading, isFetching } = useQuery<SpotifyLibraryPage<SpotifyPlaylist>>({
    queryKey: ['spotify-playlists', offset],
    queryFn: () =>
      api
        .get<SpotifyLibraryPage<SpotifyPlaylist>>(`/spotify/library/playlists?offset=${offset}&limit=${limit}`)
        .then((r) => r.data),
    staleTime: 2 * 60_000,
  })

  const playlists = data?.items ?? []
  const total = data?.total ?? 0
  const pages = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit) + 1

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-foreground-subtle" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {playlists.length === 0 && (
        <p className="text-sm text-foreground-muted text-center py-12">Keine Playlists gefunden.</p>
      )}

      {playlists.map((pl) => {
        const isOpen = expandedId === pl.id
        const imgUrl = pl.images[0]?.url

        return (
          <div key={pl.id} className="rounded-xl border border-edge bg-surface-raised overflow-hidden">
            {/* Playlist header row */}
            <button
              onClick={() => setExpandedId(isOpen ? null : pl.id)}
              className="w-full flex items-center gap-3 px-3 py-3 hover:bg-surface-overlay/50 transition-colors text-left"
            >
              {imgUrl ? (
                <img src={imgUrl} alt={pl.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-surface-overlay flex items-center justify-center flex-shrink-0">
                  <ListMusic size={16} className="text-foreground-subtle" strokeWidth={1.5} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate leading-tight">{pl.name}</p>
                <p className="text-[11px] text-foreground-muted mt-0.5">
                  {pl.tracks.total} Songs · {pl.owner.display_name}
                </p>
              </div>
              {isOpen
                ? <ChevronDown size={14} className="text-foreground-subtle flex-shrink-0" strokeWidth={1.75} />
                : <ChevronRight size={14} className="text-foreground-subtle flex-shrink-0" strokeWidth={1.75} />
              }
            </button>

            {/* Expanded track list */}
            {isOpen && (
              <div className="border-t border-edge/50 bg-surface px-1 py-2">
                <PlaylistTracks
                  playlistId={pl.id}
                  addedSpotifyIds={addedSpotifyIds}
                  onImport={onImport}
                  importPending={importPending}
                />
              </div>
            )}
          </div>
        )
      })}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0 || isFetching}
            className="px-3 py-1.5 rounded-lg border border-edge text-xs text-foreground-muted
                       hover:text-foreground disabled:opacity-40 transition-colors"
          >
            Zurück
          </button>
          <span className="text-xs text-foreground-muted">{currentPage} / {pages}</span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total || isFetching}
            className="px-3 py-1.5 rounded-lg border border-edge text-xs text-foreground-muted
                       hover:text-foreground disabled:opacity-40 transition-colors"
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'liked' | 'playlists'

export default function SpotifyLibrary() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('playlists')
  const [addedSpotifyIds, setAddedSpotifyIds] = useState<Set<string>>(new Set())
  const [importResult, setImportResult] = useState<{ imported: number; alreadyExisted: number } | null>(null)

  const importMutation = useMutation({
    mutationFn: (tracks: SpotifyLibraryTrack[]) =>
      api
        .post<{ imported: number; alreadyExisted: number }>('/spotify/library/import', { tracks })
        .then((r) => r.data),
    onSuccess: (result, tracks) => {
      setAddedSpotifyIds((prev) => {
        const next = new Set(prev)
        tracks.forEach((t) => next.add(t.id))
        return next
      })
      setImportResult(result)
      setTimeout(() => setImportResult(null), 4000)
      queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] })
    },
  })

  return (
    <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Spotify-Bibliothek</h1>
        <p className="text-sm text-foreground-muted mt-1">
          Songs aus deiner Spotify-Bibliothek importieren
        </p>
      </div>

      {/* Import result toast */}
      {importResult && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20 text-sm">
          <Check size={14} className="text-accent flex-shrink-0" strokeWidth={2.5} />
          <span className="text-foreground">
            <strong>{importResult.imported}</strong> importiert
            {importResult.alreadyExisted > 0 && (
              <span className="text-foreground-muted"> · {importResult.alreadyExisted} bereits vorhanden</span>
            )}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-raised rounded-xl p-1 border border-edge">
        <button
          onClick={() => setTab('liked')}
          className={[
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors',
            tab === 'liked'
              ? 'bg-surface-overlay text-foreground shadow-sm'
              : 'text-foreground-muted hover:text-foreground',
          ].join(' ')}
        >
          <Heart size={14} strokeWidth={tab === 'liked' ? 2.25 : 1.75} />
          Liked Songs
        </button>
        <button
          onClick={() => setTab('playlists')}
          className={[
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors',
            tab === 'playlists'
              ? 'bg-surface-overlay text-foreground shadow-sm'
              : 'text-foreground-muted hover:text-foreground',
          ].join(' ')}
        >
          <ListMusic size={14} strokeWidth={tab === 'playlists' ? 2.25 : 1.75} />
          Playlists
        </button>
      </div>

      {/* Tab content */}
      {tab === 'liked' ? (
        <LikedSongsTab
          addedSpotifyIds={addedSpotifyIds}
          onImport={(tracks) => importMutation.mutate(tracks)}
          importPending={importMutation.isPending}
        />
      ) : (
        <PlaylistsTab
          addedSpotifyIds={addedSpotifyIds}
          onImport={(tracks) => importMutation.mutate(tracks)}
          importPending={importMutation.isPending}
        />
      )}
    </div>
  )
}
