import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Globe, Lock, ChevronRight, Trash2, Check } from 'lucide-react'
import api from '../services/api'
import type { Collection } from '../types'
import TrackCover from '../components/TrackCover'
import BottomSheet from '../components/BottomSheet'

// ─── Collection card ──────────────────────────────────────────────────────────

function CollectionCard({
  collection,
  onDelete,
}: {
  collection: Collection
  onDelete: () => void
}) {
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Pick up to 4 cover images from first items that have a savedLyric
  const covers = (collection.items ?? [])
    .filter((item) => item.savedLyric)
    .slice(0, 4)
    .map((item) => ({
      src: item.savedLyric?.searchHistory?.imgUrl,
      track: item.savedLyric?.track ?? '',
      artist: item.savedLyric?.artist ?? '',
    }))

  const itemCount = collection._count?.items ?? collection.items?.length ?? 0

  return (
    <>
      <div
        className="group relative rounded-xl bg-surface-raised border border-edge overflow-hidden
                   hover:border-foreground-muted/30 transition-colors cursor-pointer"
        onClick={() => navigate(`/collections/${collection.id}`)}
      >
        {/* Cover mosaic */}
        <div className="aspect-square bg-surface grid grid-cols-2 gap-0.5 p-0.5">
          {covers.length === 0 ? (
            <div className="col-span-2 row-span-2 flex items-center justify-center bg-surface-overlay">
              <BookOpen size={28} className="text-foreground-subtle" strokeWidth={1.25} />
            </div>
          ) : covers.length === 1 ? (
            <TrackCover
              src={covers[0].src}
              track={covers[0].track}
              artist={covers[0].artist}
              className="col-span-2 row-span-2 rounded-lg"
              iconSize={28}
            />
          ) : (
            covers.slice(0, 4).map((c, i) => (
              <TrackCover
                key={i}
                src={c.src}
                track={c.track}
                artist={c.artist}
                className="rounded-sm"
                iconSize={14}
              />
            ))
          )}
        </div>

        {/* Info */}
        <div className="px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{collection.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {collection.isPublic ? (
                <Globe size={10} className="text-foreground-subtle flex-shrink-0" strokeWidth={1.75} />
              ) : (
                <Lock size={10} className="text-foreground-subtle flex-shrink-0" strokeWidth={1.75} />
              )}
              <span className="text-[11px] text-foreground-subtle">
                {itemCount} {itemCount === 1 ? 'song' : 'songs'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-foreground-subtle
                         hover:text-red-400 transition-all"
              aria-label="Delete collection"
            >
              <Trash2 size={12} strokeWidth={1.75} />
            </button>
            <ChevronRight size={14} className="text-foreground-subtle" strokeWidth={1.75} />
          </div>
        </div>
      </div>

      <BottomSheet open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Collection löschen</h3>
            <p className="text-sm text-foreground-muted mt-1">
              Bist du sicher, dass du <strong>{collection.name}</strong> löschen willst?
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => { onDelete(); setConfirmDelete(false) }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm
                         font-semibold hover:bg-red-600 transition-colors"
            >
              Ja, löschen
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-surface-overlay text-foreground
                         text-sm font-medium hover:bg-surface-overlay/80 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}

// ─── Public collection card (read-only) ───────────────────────────────────────

function PublicCollectionCard({ collection }: { collection: Collection }) {
  const navigate = useNavigate()

  const covers = (collection.items ?? [])
    .filter((item) => item.savedLyric)
    .slice(0, 4)
    .map((item) => ({
      src: item.savedLyric?.searchHistory?.imgUrl,
      track: item.savedLyric?.track ?? '',
      artist: item.savedLyric?.artist ?? '',
    }))

  const itemCount = collection._count?.items ?? 0

  return (
    <div
      className="group relative rounded-xl bg-surface-raised border border-edge overflow-hidden
                 hover:border-foreground-muted/30 transition-colors cursor-pointer"
      onClick={() => navigate(`/collections/${collection.id}`)}
    >
      <div className="aspect-square bg-surface grid grid-cols-2 gap-0.5 p-0.5">
        {covers.length === 0 ? (
          <div className="col-span-2 row-span-2 flex items-center justify-center bg-surface-overlay">
            <BookOpen size={28} className="text-foreground-subtle" strokeWidth={1.25} />
          </div>
        ) : covers.length === 1 ? (
          <TrackCover src={covers[0].src} track={covers[0].track} artist={covers[0].artist}
            className="col-span-2 row-span-2 rounded-lg" iconSize={28} />
        ) : (
          covers.slice(0, 4).map((c, i) => (
            <TrackCover key={i} src={c.src} track={c.track} artist={c.artist}
              className="rounded-sm" iconSize={14} />
          ))
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm font-medium text-foreground truncate">{collection.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Globe size={10} className="text-foreground-subtle flex-shrink-0" strokeWidth={1.75} />
          <span className="text-[11px] text-foreground-subtle truncate">
            {collection.user?.name ?? 'Anonym'} · {itemCount} {itemCount === 1 ? 'song' : 'songs'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Collections() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'mine' | 'discover'>('mine')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const { data: collections = [], isLoading } = useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: () => api.get<Collection[]>('/collections').then((r) => r.data),
  })

  const { data: publicCollections = [], isLoading: isLoadingPublic } = useQuery<Collection[]>({
    queryKey: ['collections-public'],
    queryFn: () => api.get<Collection[]>('/collections/public').then((r) => r.data),
    enabled: tab === 'discover',
    staleTime: 60_000,
  })

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      api.post<Collection>('/collections', { name }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      setCreating(false)
      setNewName('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/collections/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collections'] }),
  })

  const skeletonGrid = (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl bg-surface-raised border border-edge animate-pulse">
          <div className="aspect-square" />
          <div className="p-3 space-y-1.5">
            <div className="h-3.5 w-24 rounded-full bg-surface-overlay" />
            <div className="h-2.5 w-16 rounded-full bg-surface-overlay" />
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1">
            Library
          </p>
          <h1 className="text-xl font-semibold text-foreground">Collections</h1>
        </div>
        {tab === 'mine' && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-black
                       text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={12} strokeWidth={2.5} />
            Neu
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex items-center rounded-lg border border-edge bg-surface-raised p-0.5 gap-0.5 w-fit">
        {(['mine', 'discover'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              tab === t
                ? 'bg-surface-overlay text-foreground'
                : 'text-foreground-subtle hover:text-foreground-muted',
            ].join(' ')}
          >
            {t === 'mine' ? (
              <><Lock size={10} strokeWidth={2} />Meine</>
            ) : (
              <><Globe size={10} strokeWidth={2} />Entdecken</>
            )}
          </button>
        ))}
      </div>

      {/* My collections tab */}
      {tab === 'mine' && (
        <>
          {isLoading ? skeletonGrid : collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-xl border
                            border-dashed border-edge gap-3 text-center">
              <BookOpen size={28} className="text-foreground-subtle" strokeWidth={1.25} />
              <div className="space-y-1">
                <p className="text-sm text-foreground-muted font-medium">Noch keine Collections</p>
                <p className="text-xs text-foreground-subtle">
                  Gruppiere deine Songs in thematischen Playlists.
                </p>
              </div>
              <button
                onClick={() => setCreating(true)}
                className="mt-1 px-3 py-1.5 rounded-lg bg-surface-raised border border-edge text-xs
                           font-medium text-foreground-muted hover:text-foreground
                           hover:border-foreground-muted/50 transition-colors"
              >
                Erste Collection erstellen
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {collections.map((c) => (
                <CollectionCard key={c.id} collection={c} onDelete={() => deleteMutation.mutate(c.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Discover tab */}
      {tab === 'discover' && (
        <>
          {isLoadingPublic ? skeletonGrid : publicCollections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-xl border
                            border-dashed border-edge gap-3 text-center">
              <Globe size={28} className="text-foreground-subtle" strokeWidth={1.25} />
              <p className="text-sm text-foreground-muted font-medium">Keine öffentlichen Collections</p>
              <p className="text-xs text-foreground-subtle">
                Noch hat niemand eine Collection veröffentlicht.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {publicCollections.map((c) => (
                <PublicCollectionCard key={c.id} collection={c} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Create sheet */}
      <BottomSheet open={creating} onClose={() => { setCreating(false); setNewName('') }}>
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-foreground">Neue Collection</h3>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) createMutation.mutate(newName.trim())
              if (e.key === 'Escape') { setCreating(false); setNewName('') }
            }}
            placeholder="Name der Collection…"
            className="w-full bg-surface-raised border border-edge rounded-xl px-4 py-3 text-sm
                       focus:outline-none focus:border-foreground-muted/60 transition-colors"
          />
          <div className="flex gap-2">
            <button
              onClick={() => newName.trim() && createMutation.mutate(newName.trim())}
              disabled={!newName.trim() || createMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-black text-sm
                         font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <Check size={12} strokeWidth={2.5} />
              {createMutation.isPending ? 'Erstellen…' : 'Erstellen'}
            </button>
            <button
              onClick={() => { setCreating(false); setNewName('') }}
              className="px-4 py-2 rounded-xl bg-surface-overlay text-foreground text-sm
                         font-medium hover:bg-surface-overlay/80 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
