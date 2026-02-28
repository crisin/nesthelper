import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Globe, Lock, Pencil, Check, X, Trash2,
  Plus, Search, ChevronUp, ChevronDown,
} from 'lucide-react'
import api from '../services/api'
import type { Collection, CollectionItem, SavedLyric } from '../types'
import TrackCover from '../components/TrackCover'
import BottomSheet from '../components/BottomSheet'

// ─── Rename sheet ─────────────────────────────────────────────────────────────

function RenameSheet({
  open,
  onClose,
  collection,
}: {
  open: boolean
  onClose: () => void
  collection: Collection
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(collection.name)
  const [isPublic, setIsPublic] = useState(collection.isPublic)

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/collections/${collection.id}`, { name, isPublic }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      queryClient.invalidateQueries({ queryKey: ['collection', collection.id] })
      onClose()
    },
  })

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-foreground">Collection bearbeiten</h3>
        <div className="space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) mutation.mutate()
              if (e.key === 'Escape') onClose()
            }}
            placeholder="Name…"
            className="w-full bg-surface-raised border border-edge rounded-xl px-4 py-3 text-sm
                       focus:outline-none focus:border-foreground-muted/60 transition-colors"
          />
          <button
            onClick={() => setIsPublic((v) => !v)}
            className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground
                       transition-colors"
          >
            {isPublic ? (
              <Globe size={14} strokeWidth={1.75} className="text-accent" />
            ) : (
              <Lock size={14} strokeWidth={1.75} />
            )}
            {isPublic ? 'Öffentlich' : 'Privat'}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-black text-sm
                       font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <Check size={12} strokeWidth={2.5} />
            {mutation.isPending ? 'Speichern…' : 'Speichern'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-overlay text-foreground text-sm
                       font-medium hover:bg-surface-overlay/80 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

// ─── Add song sheet ───────────────────────────────────────────────────────────

function AddSongSheet({
  open,
  onClose,
  collectionId,
  existingIds,
}: {
  open: boolean
  onClose: () => void
  collectionId: string
  existingIds: Set<string>
}) {
  const queryClient = useQueryClient()
  const [q, setQ] = useState('')

  const { data: songs = [] } = useQuery<SavedLyric[]>({
    queryKey: ['saved-lyrics'],
    queryFn: () => api.get<SavedLyric[]>('/saved-lyrics').then((r) => r.data),
    enabled: open,
  })

  const addMutation = useMutation({
    mutationFn: (savedLyricId: string) =>
      api.post(`/collections/${collectionId}/items`, { savedLyricId }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] })
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      onClose()
    },
  })

  const filtered = songs.filter(
    (s) =>
      !existingIds.has(s.id) &&
      (q === '' ||
        s.track.toLowerCase().includes(q.toLowerCase()) ||
        s.artist.toLowerCase().includes(q.toLowerCase())),
  )

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Song hinzufügen</h3>
        <div className="relative">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle pointer-events-none"
            strokeWidth={1.75}
          />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche…"
            className="w-full pl-9 pr-3 py-2 bg-surface-raised border border-edge rounded-lg text-sm
                       placeholder:text-foreground-subtle focus:outline-none focus:border-foreground-muted/60
                       transition-colors"
          />
        </div>
        <ul className="max-h-64 overflow-y-auto space-y-1 -mx-1">
          {filtered.length === 0 ? (
            <li className="px-2 py-3 text-sm text-foreground-subtle text-center">
              {q ? 'Keine Treffer.' : 'Alle Songs bereits hinzugefügt.'}
            </li>
          ) : (
            filtered.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => addMutation.mutate(s.id)}
                  disabled={addMutation.isPending}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left
                             hover:bg-surface-raised transition-colors disabled:opacity-40"
                >
                  <TrackCover
                    src={s.searchHistory?.imgUrl}
                    track={s.track}
                    artist={s.artists?.join(", ") || s.artist}
                    className="w-9 h-9 rounded-lg flex-shrink-0"
                    iconSize={14}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.track}</p>
                    <p className="text-xs text-foreground-muted truncate">{s.artists?.join(", ") || s.artist}</p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </BottomSheet>
  )
}

// ─── Collection item row ──────────────────────────────────────────────────────

function ItemRow({
  item,
  collectionId,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  item: CollectionItem
  collectionId: string
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const removeMutation = useMutation({
    mutationFn: () => api.delete(`/collections/${collectionId}/items/${item.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] })
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
  })

  if (item.savedLyric) {
    const song = item.savedLyric
    return (
      <li className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-raised border border-edge
                     hover:border-foreground-muted/30 transition-colors group">
        <TrackCover
          src={song.searchHistory?.imgUrl}
          track={song.track}
          artist={song.artists?.join(", ") || song.artist}
          className="w-10 h-10 rounded-lg flex-shrink-0"
          iconSize={16}
        />
        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => navigate(`/songs/${song.id}`)}
        >
          <p className="text-sm font-medium text-foreground truncate">{song.track}</p>
          <p className="text-xs text-foreground-muted truncate">{song.artists?.join(", ") || song.artist}</p>
        </button>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 rounded text-foreground-subtle hover:text-foreground disabled:opacity-20 transition-colors"
            aria-label="Nach oben"
          >
            <ChevronUp size={13} strokeWidth={2} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 rounded text-foreground-subtle hover:text-foreground disabled:opacity-20 transition-colors"
            aria-label="Nach unten"
          >
            <ChevronDown size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending}
            className="p-1 rounded text-foreground-subtle hover:text-red-400 transition-colors"
            aria-label="Entfernen"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      </li>
    )
  }

  if (item.line) {
    const line = item.line
    const parent = line.lyrics?.savedLyric
    return (
      <li className="flex items-start gap-3 px-4 py-3 rounded-xl bg-surface-raised border border-edge
                     hover:border-foreground-muted/30 transition-colors group">
        <div className="w-1 self-stretch rounded-full bg-accent/40 flex-shrink-0 mt-1" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-relaxed italic">&ldquo;{line.text}&rdquo;</p>
          {parent && (
            <p className="text-xs text-foreground-subtle mt-0.5">
              {parent.track} · {parent.artists?.join(", ") || parent.artist}
            </p>
          )}
        </div>
        <button
          onClick={() => removeMutation.mutate()}
          disabled={removeMutation.isPending}
          className="flex-shrink-0 p-1 rounded text-foreground-subtle hover:text-red-400
                     opacity-0 group-hover:opacity-100 transition-all"
          aria-label="Entfernen"
        >
          <X size={13} strokeWidth={2} />
        </button>
      </li>
    )
  }

  return null
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: collection, isLoading } = useQuery<Collection>({
    queryKey: ['collection', id],
    queryFn: () => api.get<Collection>(`/collections/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/collections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      navigate('/collections')
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.patch(`/collections/${id}/items/reorder`, { orderedIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collection', id] }),
  })

  function moveItem(items: CollectionItem[], fromIndex: number, toIndex: number) {
    const reordered = [...items]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    reorderMutation.mutate(reordered.map((i) => i.id))
  }

  if (isLoading) {
    return (
      <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-6">
        <div className="h-4 w-24 rounded-full bg-surface-raised animate-pulse" />
        <div className="h-7 w-48 rounded-full bg-surface-raised animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-surface-raised border border-edge animate-pulse" />
        ))}
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/collections')}
          className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground
                     transition-colors mb-6"
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
          Collections
        </button>
        <p className="text-sm text-foreground-subtle">Collection nicht gefunden.</p>
      </div>
    )
  }

  const items = collection.items ?? []
  const existingIds = new Set(items.map((i) => i.savedLyricId).filter(Boolean) as string[])

  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/collections')}
        className="flex items-center gap-1.5 py-1.5 -ml-1 px-1 text-sm text-foreground-muted
                   hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} strokeWidth={1.75} />
        Collections
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground truncate">{collection.name}</h1>
            {collection.isPublic ? (
              <Globe size={14} className="text-foreground-subtle flex-shrink-0" strokeWidth={1.75} />
            ) : (
              <Lock size={14} className="text-foreground-subtle flex-shrink-0" strokeWidth={1.75} />
            )}
          </div>
          {collection.description && (
            <p className="text-sm text-foreground-muted mt-1">{collection.description}</p>
          )}
          <p className="text-xs text-foreground-subtle mt-1">
            {items.length} {items.length === 1 ? 'Eintrag' : 'Einträge'}
            {collection.user && ` · von ${collection.user.name ?? 'Unbekannt'}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setEditOpen(true)}
            className="p-2 rounded-lg text-foreground-subtle hover:text-foreground
                       hover:bg-surface-raised transition-colors"
            aria-label="Bearbeiten"
          >
            <Pencil size={14} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 rounded-lg text-foreground-subtle hover:text-red-400
                       hover:bg-surface-raised transition-colors"
            aria-label="Löschen"
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border
                        border-dashed border-edge gap-3 text-center">
          <p className="text-sm text-foreground-muted">Diese Collection ist noch leer.</p>
          <button
            onClick={() => setAddOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-surface-raised border border-edge text-xs
                       font-medium text-foreground-muted hover:text-foreground
                       hover:border-foreground-muted/50 transition-colors"
          >
            Song hinzufügen
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <ItemRow
              key={item.id}
              item={item}
              collectionId={id!}
              isFirst={i === 0}
              isLast={i === items.length - 1}
              onMoveUp={() => moveItem(items, i, i - 1)}
              onMoveDown={() => moveItem(items, i, i + 1)}
            />
          ))}
        </ul>
      )}

      {/* Add button */}
      {items.length > 0 && (
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 text-xs text-foreground-muted
                     hover:text-foreground transition-colors"
        >
          <Plus size={12} strokeWidth={2} />
          Song hinzufügen
        </button>
      )}

      {/* Sheets & dialogs */}
      <RenameSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        collection={collection}
      />

      <AddSongSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        collectionId={id!}
        existingIds={existingIds}
      />

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
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm
                         font-semibold disabled:opacity-50 hover:bg-red-600 transition-colors"
            >
              {deleteMutation.isPending ? 'Löschen…' : 'Ja, löschen'}
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
    </div>
  )
}
