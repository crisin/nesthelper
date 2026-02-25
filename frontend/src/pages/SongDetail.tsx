import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, Trash2, StickyNote, Check } from 'lucide-react'
import api from '../services/api'
import type { SavedLyric } from '../types'
import BottomSheet from '../components/BottomSheet'
import TrackCover from '../components/TrackCover'
import TagSelector from '../components/TagSelector'
import LyricsEditor from '../components/LyricsEditor'

// ─── Note section ─────────────────────────────────────────────────────────────

function NoteSection({ savedLyricId, note }: { savedLyricId: string; note?: string | null }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note ?? '')
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: (text: string) =>
      api.patch(`/saved-lyrics/${savedLyricId}/note`, { text }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] })
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest">
          Meine Notiz
        </p>
        {saved && <span className="text-[10px] text-accent">Gespeichert</span>}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setEditing(false); setDraft(note ?? '') }
            }}
            placeholder="Was bedeutet dieser Song für dich?"
            rows={3}
            className="w-full bg-surface-raised border border-edge rounded-xl px-4 py-3 text-sm
                       leading-relaxed focus:outline-none focus:border-foreground-muted/60 transition-colors resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => save.mutate(draft)}
              disabled={save.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-black
                         text-xs font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <Check size={11} strokeWidth={2.5} />
              {save.isPending ? 'Speichern…' : 'Speichern'}
            </button>
            <button
              onClick={() => { setEditing(false); setDraft(note ?? '') }}
              className="text-xs text-foreground-muted hover:text-foreground transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setDraft(note ?? ''); setEditing(true) }}
          className="w-full text-left rounded-xl border border-dashed border-edge px-4 py-3
                     hover:border-foreground-muted/40 hover:bg-surface-raised/50 transition-colors"
        >
          {note ? (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{note}</p>
          ) : (
            <div className="flex items-center gap-2 text-foreground-subtle">
              <StickyNote size={13} strokeWidth={1.5} />
              <span className="text-xs">Notiz hinzufügen…</span>
            </div>
          )}
        </button>
      )}
    </div>
  )
}

export default function SongDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: songs = [], isLoading } = useQuery<SavedLyric[]>({
    queryKey: ['saved-lyrics'],
    queryFn: () => api.get<SavedLyric[]>('/saved-lyrics').then((r) => r.data),
  })

  const song = songs.find((s) => s.id === id)

  const remove = useMutation({
    mutationFn: () => api.delete(`/saved-lyrics/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] })
      navigate('/songs')
    },
  })

  if (isLoading) {
    return (
      <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-6">
        <div className="h-5 w-24 rounded-full bg-surface-raised animate-pulse" />
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-surface-raised animate-pulse flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 rounded-full bg-surface-raised animate-pulse" />
            <div className="h-3 w-32 rounded-full bg-surface-raised animate-pulse" />
          </div>
        </div>
        <div className="h-96 rounded-xl bg-surface-raised animate-pulse" />
      </div>
    )
  }

  if (!song) {
    return (
      <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/songs')}
          className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
          Gespeicherte Songs
        </button>
        <p className="text-sm text-foreground-subtle">Song nicht gefunden.</p>
      </div>
    )
  }

  const imgUrl = song.searchHistory?.imgUrl
  const searchUrl = song.searchHistory?.url
  const tags = song.tags ?? []

  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-6 overflow-hidden">
      {/* Back */}
      <button
        onClick={() => navigate('/songs')}
        className="flex items-center gap-1.5 py-1.5 -ml-1 px-1 text-sm text-foreground-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} strokeWidth={1.75} />
        Gespeicherte Songs
      </button>

      {/* Song header */}
      <div className="flex items-start gap-4">
        <TrackCover
          src={imgUrl}
          track={song.track}
          artist={song.artist}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex-shrink-0"
          iconSize={24}
        />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground leading-tight">{song.track}</h1>
              <p className="text-sm text-foreground-muted mt-0.5">{song.artist}</p>
              {searchUrl && (
                <a
                  href={searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-foreground-subtle hover:text-accent transition-colors mt-1.5"
                >
                  Auf Spotify öffnen
                  <ExternalLink size={11} strokeWidth={1.75} />
                </a>
              )}
            </div>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex-shrink-0 flex items-center gap-1 text-xs text-foreground-subtle hover:text-red-400 transition-colors mt-1"
            >
              <Trash2 size={12} strokeWidth={1.75} />
              Löschen
            </button>
          </div>

          {/* Tags */}
          <TagSelector savedLyricId={song.id} tags={tags} />
        </div>
      </div>

      {/* Lyrics */}
      <LyricsEditor savedLyricId={song.id} legacyLyrics={song.lyrics ?? ''} />

      {/* Personal note */}
      <NoteSection savedLyricId={song.id} note={song.note} />

      {/* Delete confirmation */}
      <BottomSheet open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Song löschen</h3>
            <p className="text-sm text-foreground-muted mt-1">
              Bist du sicher, dass du <strong>{song.track}</strong> löschen willst? Dies kann nicht
              rückgängig gemacht werden.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold
                         disabled:opacity-50 hover:bg-red-600 transition-colors"
            >
              {remove.isPending ? 'Removing…' : 'Yes, remove'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-surface-overlay text-foreground text-sm font-medium
                         hover:bg-surface-overlay/80 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
