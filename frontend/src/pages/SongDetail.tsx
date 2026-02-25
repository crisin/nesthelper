import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Music, Trash2, ExternalLink, Eye, Pencil } from 'lucide-react'
import api from '../services/api'
import type { SavedLyric } from '../types'
import BottomSheet from '../components/BottomSheet'
import TrackCover from '../components/TrackCover'

type ViewMode = 'view' | 'edit'

function LyricsView({ lyrics, onEdit }: { lyrics: string; onEdit: () => void }) {
  if (!lyrics.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-edge gap-3 text-center">
        <Music size={26} className="text-foreground-subtle" strokeWidth={1.25} />
        <div className="space-y-1">
          <p className="text-sm text-foreground-muted font-medium">Noch keine Lyrics</p>
          <p className="text-xs text-foreground-subtle">
            Wechsel in den Editiermodus, um Lyrics hinzuzufügen.
          </p>
        </div>
        <button
          onClick={onEdit}
          className="mt-1 px-3 py-1.5 rounded-lg bg-surface-raised border border-edge text-xs font-medium
                     text-foreground-muted hover:text-foreground hover:border-foreground-muted/50 transition-colors"
        >
          Lyrics hinzufügen
        </button>
      </div>
    )
  }

  const stanzas = lyrics.split(/\n{2,}/)

  return (
    <div className="rounded-xl bg-surface-raised border border-edge px-5 sm:px-7 py-6">
      <div className="space-y-6">
        {stanzas.map((stanza, i) => {
          const lines = stanza.split('\n')
          return (
            <p
              key={i}
              className="text-[15px] leading-[1.85] text-foreground font-normal tracking-[0.008em]"
            >
              {lines.map((line, j) => (
                <span key={j}>
                  {line || <span>&thinsp;</span>}
                  {j < lines.length - 1 && <br />}
                </span>
              ))}
            </p>
          )
        })}
      </div>
    </div>
  )
}

export default function SongDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [draft, setDraft] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('view')

  const { data: songs = [], isLoading } = useQuery<SavedLyric[]>({
    queryKey: ['saved-lyrics'],
    queryFn: () => api.get<SavedLyric[]>('/saved-lyrics').then((r) => r.data),
  })

  const song = songs.find((s) => s.id === id)

  const updateLyrics = useMutation({
    mutationFn: (lyrics: string) =>
      api.patch(`/saved-lyrics/${id}`, { lyrics }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] })
      setDraft(null)
      setConfirmed(true)
      setTimeout(() => setConfirmed(false), 2000)
    },
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/saved-lyrics/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] })
      navigate('/songs')
    },
  })

  if (isLoading) {
    return (
      <div className="px-4 sm:px-8 py-8 max-w-2xl mx-auto space-y-6">
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
      <div className="px-4 sm:px-8 py-8 max-w-2xl mx-auto">
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
  const currentLyrics = draft !== null ? draft : (song.lyrics ?? '')
  const isDirty = draft !== null && draft !== song.lyrics

  return (
    <div className="px-4 sm:px-8 py-8 max-w-2xl mx-auto space-y-6 overflow-hidden">
      {/* Back */}
      <button
        onClick={() => navigate('/songs')}
        className="flex items-center gap-1.5 py-1.5 -ml-1 px-1 text-sm text-foreground-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} strokeWidth={1.75} />
        Gespeicherte Songs
      </button>

      {/* Song header */}
      <div className="flex items-center gap-4">
        <TrackCover
          src={imgUrl}
          track={song.track}
          artist={song.artist}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl"
          iconSize={24}
        />

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
              Lyrics online suchen
              <ExternalLink size={11} strokeWidth={1.75} />
            </a>
          )}
        </div>
      </div>

      {/* Lyrics section */}
      <div className="space-y-3">
        {/* Section header */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest">
            Lyrics
          </p>

          <div className="flex items-center gap-2 ml-auto">
            {/* View / Edit toggle */}
            <div className="flex items-center rounded-lg border border-edge bg-surface-raised p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode('view')}
                title="View lyrics"
                className={[
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  viewMode === 'view'
                    ? 'bg-surface-overlay text-foreground'
                    : 'text-foreground-subtle hover:text-foreground-muted',
                ].join(' ')}
              >
                <Eye size={11} strokeWidth={2} />
                Ansicht
              </button>
              <button
                onClick={() => setViewMode('edit')}
                title="Edit lyrics"
                className={[
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  viewMode === 'edit'
                    ? 'bg-surface-overlay text-foreground'
                    : 'text-foreground-subtle hover:text-foreground-muted',
                ].join(' ')}
              >
                <Pencil size={11} strokeWidth={2} />
                Bearbeiten
              </button>
            </div>

            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 text-xs text-foreground-subtle hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} strokeWidth={1.75} />
              Löschen
            </button>
          </div>

          <BottomSheet open={confirmDelete} onClose={() => setConfirmDelete(false)}>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Song löschen</h3>
                <p className="text-sm text-foreground-muted mt-1">
                  Bist du sicher, dass du <strong>{song.track}</strong> löschen willst? Dies kann nicht rückgängig gemacht werden.
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

        {/* Content */}
        {viewMode === 'view' ? (
          <LyricsView lyrics={currentLyrics} onEdit={() => setViewMode('edit')} />
        ) : (
          <>
            <textarea
              className="w-full min-h-48 sm:min-h-96 bg-surface-raised border border-edge rounded-xl p-4 resize-y
                         focus:outline-none focus:border-foreground-muted/60 transition-colors text-sm leading-relaxed"
              placeholder="Lyrics hier einfügen…"
              value={currentLyrics}
              onChange={(e) => setDraft(e.target.value)}
            />

            <div className="flex items-center gap-3">
              <button
                onClick={() => updateLyrics.mutate(currentLyrics)}
                disabled={!isDirty || updateLyrics.isPending}
                className="px-4 py-2 sm:py-1.5 rounded-lg bg-accent text-black text-xs font-semibold
                           disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {updateLyrics.isPending ? 'Speichern…' : 'Lyrics speichern'}
              </button>
              {confirmed && <span className="text-xs text-accent">Gespeichert!</span>}
              {isDirty && !updateLyrics.isPending && (
                <button
                  onClick={() => setDraft(null)}
                  className="text-xs text-foreground-muted hover:text-foreground transition-colors"
                >
                  Verwerfen
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
