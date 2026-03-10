import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, ExternalLink, Trash2, StickyNote, Check,
  ChevronDown, ChevronUp, Users2, Clapperboard, Play, Pencil, X,
} from 'lucide-react'
import api from '../services/api'
import type { SavedLyric, SongNote, TrackInsights } from '../types'
import { useAuthStore } from '../stores/authStore'
import BottomSheet from '../components/BottomSheet'
import TrackCover from '../components/TrackCover'
import TagSelector from '../components/TagSelector'
import LyricsEditor from '../components/LyricsEditor'

// ─── Song notes section (public thread, own note editable) ───────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} Min.`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} Std.`
  return `vor ${Math.floor(h / 24)} Tagen`
}

function SongNotesSection({ spotifyId }: { spotifyId: string }) {
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((s) => s.user?.id ?? '')
  const [editingId, setEditingId] = useState<'own' | null>(null)
  const [draft, setDraft] = useState('')

  const { data: notes = [] } = useQuery<SongNote[]>({
    queryKey: ['song-notes', spotifyId],
    queryFn: () => api.get<SongNote[]>(`/songs/${spotifyId}/notes`).then((r) => r.data),
    staleTime: 30_000,
  })

  const myNote = notes.find((n) => n.userId === currentUserId) ?? null
  const othersNotes = notes.filter((n) => n.userId !== currentUserId)

  const save = useMutation({
    mutationFn: (text: string) =>
      api.put(`/songs/${spotifyId}/notes`, { text }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['song-notes', spotifyId] })
      setEditingId(null)
    },
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/songs/${spotifyId}/notes`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['song-notes', spotifyId] })
      setEditingId(null)
    },
  })

  function openEditor() {
    setDraft(myNote?.text ?? '')
    setEditingId('own')
  }

  const hasAnyNotes = notes.length > 0

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest">
        Notizen
      </p>

      {/* Others' notes (read-only) */}
      {othersNotes.length > 0 && (
        <div className="space-y-2">
          {othersNotes.map((n) => (
            <div
              key={n.id}
              className="rounded-xl border border-edge bg-surface-raised px-4 py-3 space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-foreground-muted">
                  {n.user.name ?? 'Anonym'}
                </span>
                <span className="text-[10px] text-foreground-subtle">{timeAgo(n.updatedAt)}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{n.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Own note */}
      {editingId === 'own' ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setEditingId(null)
            }}
            placeholder="Was bedeutet dieser Song für dich?"
            rows={3}
            className="w-full bg-surface-raised border border-edge rounded-xl px-4 py-3 text-sm
                       leading-relaxed focus:outline-none focus:border-foreground-muted/60 transition-colors resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => draft.trim() && save.mutate(draft.trim())}
              disabled={!draft.trim() || save.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-black
                         text-xs font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <Check size={11} strokeWidth={2.5} />
              {save.isPending ? 'Speichern…' : 'Speichern'}
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="text-xs text-foreground-muted hover:text-foreground transition-colors"
            >
              Abbrechen
            </button>
            {myNote && (
              <button
                onClick={() => remove.mutate()}
                disabled={remove.isPending}
                className="ml-auto text-xs text-foreground-subtle hover:text-red-400 transition-colors"
              >
                Löschen
              </button>
            )}
          </div>
        </div>
      ) : myNote ? (
        <div className="rounded-xl border border-edge bg-surface-raised px-4 py-3 space-y-1 group relative">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-accent/80">Du</span>
            <span className="text-[10px] text-foreground-subtle">{timeAgo(myNote.updatedAt)}</span>
            <button
              onClick={openEditor}
              className="ml-auto opacity-0 group-hover:opacity-100 text-foreground-subtle hover:text-foreground
                         transition-all p-0.5 rounded"
            >
              <Pencil size={11} strokeWidth={1.75} />
            </button>
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{myNote.text}</p>
        </div>
      ) : (
        <button
          onClick={openEditor}
          className="w-full text-left rounded-xl border border-dashed border-edge px-4 py-3
                     hover:border-foreground-muted/40 hover:bg-surface-raised/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-foreground-subtle">
            <StickyNote size={13} strokeWidth={1.5} />
            <span className="text-xs">
              {hasAnyNotes ? 'Eigene Notiz hinzufügen…' : 'Notiz hinzufügen…'}
            </span>
          </div>
        </button>
      )}
    </div>
  )
}

// ─── Video section ────────────────────────────────────────────────────────────

function extractYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  )
  return match?.[1] ?? null
}

interface YtMeta { title: string; author_name: string }

function VideoSection({ spotifyId, videoUrl }: { spotifyId: string; videoUrl?: string | null }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const savedYtId = extractYoutubeId(videoUrl ?? '')

  const { data: ytMeta } = useQuery<YtMeta>({
    queryKey: ['yt-oembed', savedYtId],
    queryFn: () =>
      fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${savedYtId}&format=json`,
      ).then((r) => r.json()),
    enabled: !!savedYtId,
    staleTime: Infinity,
    retry: false,
  })

  const save = useMutation({
    mutationFn: (url: string) =>
      api.patch(`/songs/${spotifyId}/video`, { url }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] })
      setEditing(false)
    },
  })

  const sectionLabel = (
    <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest">
      Musikvideo
    </p>
  )

  if (editing) {
    return (
      <div className="space-y-2">
        {sectionLabel}
        <div className="space-y-2">
          <input
            autoFocus
            type="url"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) save.mutate(draft.trim())
              if (e.key === 'Escape') setEditing(false)
            }}
            placeholder="YouTube-Link einfügen…"
            className="w-full bg-surface-raised border border-edge rounded-xl px-4 py-3 text-sm
                       focus:outline-none focus:border-foreground-muted/60 transition-colors"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => draft.trim() && save.mutate(draft.trim())}
              disabled={!draft.trim() || save.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-black
                         text-xs font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <Check size={11} strokeWidth={2.5} />
              {save.isPending ? 'Speichern…' : 'Speichern'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-foreground-muted hover:text-foreground transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!videoUrl) {
    return (
      <div className="space-y-2">
        {sectionLabel}
        <button
          onClick={() => { setDraft(''); setEditing(true) }}
          className="w-full text-left rounded-xl border border-dashed border-edge px-4 py-3
                     hover:border-foreground-muted/40 hover:bg-surface-raised/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-foreground-subtle">
            <Clapperboard size={13} strokeWidth={1.5} />
            <span className="text-xs">Musikvideo verknüpfen…</span>
          </div>
        </button>
      </div>
    )
  }

  if (savedYtId) {
    const thumbUrl = `https://img.youtube.com/vi/${savedYtId}/hqdefault.jpg`
    const videoLink = `https://www.youtube.com/watch?v=${savedYtId}`
    return (
      <div className="space-y-2">
        {sectionLabel}
        <div className="rounded-xl overflow-hidden border border-edge bg-surface-raised">
          <a href={videoLink} target="_blank" rel="noopener noreferrer" className="block relative group">
            <img src={thumbUrl} alt={ytMeta?.title ?? 'Music video'} className="w-full object-cover aspect-video" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-black/55 flex items-center justify-center">
                <Play size={20} className="text-white translate-x-0.5" fill="white" strokeWidth={0} />
              </div>
            </div>
          </a>
          <div className="px-3 py-2.5 flex items-start justify-between gap-2">
            <div className="min-w-0">
              {ytMeta ? (
                <>
                  <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{ytMeta.title}</p>
                  <p className="text-xs text-foreground-muted mt-0.5">{ytMeta.author_name}</p>
                </>
              ) : (
                <p className="text-xs text-foreground-muted truncate">{videoLink}</p>
              )}
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
              <button
                onClick={() => { setDraft(videoUrl ?? ''); setEditing(true) }}
                className="w-7 h-7 flex items-center justify-center text-foreground-subtle hover:text-foreground transition-colors rounded-lg"
              >
                <Pencil size={11} strokeWidth={1.75} />
              </button>
              <button
                onClick={() => save.mutate('')}
                disabled={save.isPending}
                className="w-7 h-7 flex items-center justify-center text-foreground-subtle hover:text-red-400 transition-colors rounded-lg"
              >
                <X size={11} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  let hostname = videoUrl
  try { hostname = new URL(videoUrl).hostname.replace(/^www\./, '') } catch { /* invalid URL */ }

  return (
    <div className="space-y-2">
      {sectionLabel}
      <div className="rounded-xl border border-edge bg-surface-raised px-4 py-3 flex items-center gap-3">
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0 flex items-center gap-2 text-foreground-muted hover:text-accent transition-colors"
        >
          <ExternalLink size={13} strokeWidth={1.75} className="flex-shrink-0" />
          <span className="text-sm truncate">{hostname}</span>
        </a>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => { setDraft(videoUrl ?? ''); setEditing(true) }}
            className="w-7 h-7 flex items-center justify-center text-foreground-subtle hover:text-foreground transition-colors rounded-lg"
          >
            <Pencil size={11} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => save.mutate('')}
            disabled={save.isPending}
            className="w-7 h-7 flex items-center justify-center text-foreground-subtle hover:text-red-400 transition-colors rounded-lg"
          >
            <X size={11} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Community insights panel ─────────────────────────────────────────────────

function CommunityInsightsPanel({ spotifyId }: { spotifyId: string }) {
  const [open, setOpen] = useState(false)

  const { data: insights, isLoading } = useQuery<TrackInsights>({
    queryKey: ['insights', spotifyId],
    queryFn: () =>
      api.get<TrackInsights>(`/songs/${spotifyId}/insights`).then((r) => r.data),
    enabled: open,
    staleTime: 5 * 60_000,
  })

  return (
    <div className="border-t border-edge pt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-[11px] font-semibold text-foreground-subtle
                   uppercase tracking-widest hover:text-foreground-muted transition-colors"
      >
        <Users2 size={12} strokeWidth={2} />
        Community
        {open ? <ChevronUp size={10} strokeWidth={2} /> : <ChevronDown size={10} strokeWidth={2} />}
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-3 rounded-full bg-surface-raised animate-pulse" />
              ))}
            </div>
          ) : !insights || insights.saveCount === 0 ? (
            <p className="text-xs text-foreground-subtle">Noch keine öffentlichen Einträge für diesen Song.</p>
          ) : (
            <>
              <p className="text-xs text-foreground-muted">
                <span className="font-semibold text-foreground">{insights.saveCount}</span>{' '}
                {insights.saveCount === 1 ? 'Person hat' : 'Personen haben'} diesen Song gespeichert
              </p>

              {insights.mostAnnotatedLines.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1.5">
                    Meistkommentierte Zeile
                  </p>
                  <div className="rounded-lg bg-surface-raised border border-edge px-3 py-2">
                    <p className="text-xs text-foreground italic leading-relaxed">
                      &ldquo;{insights.mostAnnotatedLines[0].text}&rdquo;
                    </p>
                    <p className="text-[10px] text-foreground-subtle mt-1">
                      {insights.mostAnnotatedLines[0].count}{' '}
                      {insights.mostAnnotatedLines[0].count === 1 ? 'Annotation' : 'Annotationen'}
                    </p>
                  </div>
                </div>
              )}

              {insights.tagDistribution.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1.5">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {insights.tagDistribution.map(({ tag, count }) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                   bg-surface-raised border border-edge text-[11px] text-foreground-muted"
                      >
                        {tag}
                        <span className="text-[10px] text-foreground-subtle">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SongDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: songs = [], isLoading } = useQuery<SavedLyric[]>({
    queryKey: ['saved-lyrics'],
    queryFn: () => api.get<SavedLyric[]>('/saved-lyrics').then((r) => r.data),
  })

  const songFromList = songs.find((s) => s.id === id)
    ?? songs.find((s) => s.song?.spotifyId === id)

  // Fallback: ensure a bookmark exists for this spotifyId
  const { data: ensuredSong, isLoading: isEnsuring } = useQuery<SavedLyric>({
    queryKey: ['saved-lyrics-by-spotify', id],
    queryFn: () => api.get<SavedLyric>(`/saved-lyrics/by-spotify/${id}`).then((r) => r.data),
    enabled: !isLoading && !songFromList && !!id,
    staleTime: 5 * 60_000,
    retry: false,
  })

  const song = songFromList ?? ensuredSong
  const isSongLoading = isLoading || (!songFromList && isEnsuring)

  const remove = useMutation({
    mutationFn: (bookmarkId: string) => api.delete(`/saved-lyrics/${bookmarkId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] })
      navigate('/favorites')
    },
  })

  if (isSongLoading) {
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
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
          Zurück
        </button>
        <p className="text-sm text-foreground-subtle">Song nicht gefunden.</p>
      </div>
    )
  }

  const s = song.song
  const title = s?.title ?? '—'
  const artistDisplay = s?.artists?.join(', ') || s?.artist || '—'
  const spotifyId = s?.spotifyId
  const imgUrl = s?.imgUrl
  const tags = s?.tags ?? []

  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-6 overflow-hidden">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 py-1.5 -ml-1 px-1 text-sm text-foreground-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} strokeWidth={1.75} />
        Zurück
      </button>

      {/* Song header */}
      <div className="flex items-start gap-4">
        <TrackCover
          src={imgUrl}
          track={title}
          artist={artistDisplay}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex-shrink-0"
          iconSize={24}
        />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground leading-tight">{title}</h1>
              <p className="text-sm text-foreground-muted mt-0.5">{artistDisplay}</p>
              <div className="flex items-center gap-3 mt-1.5">
                {s?.spotifyUrl && (
                  <a
                    href={s.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-foreground-subtle hover:text-accent transition-colors"
                  >
                    Auf Spotify öffnen
                    <ExternalLink size={11} strokeWidth={1.75} />
                  </a>
                )}
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(`${title} ${artistDisplay} lyrics`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-foreground-subtle hover:text-accent transition-colors"
                >
                  Lyrics suchen
                  <ExternalLink size={11} strokeWidth={1.75} />
                </a>
              </div>
            </div>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 text-xs text-foreground-subtle hover:text-red-400 transition-colors flex-shrink-0 mt-1"
            >
              <Trash2 size={12} strokeWidth={1.75} />
              Löschen
            </button>
          </div>

          {/* Tags */}
          {spotifyId && <TagSelector spotifyId={spotifyId} tags={tags} />}
        </div>
      </div>

      {/* Lyrics */}
      {spotifyId && (
        <LyricsEditor spotifyId={spotifyId} fetchStatus={s?.fetchStatus} />
      )}

      {/* Song notes (public thread) */}
      {spotifyId && <SongNotesSection spotifyId={spotifyId} />}

      {/* Music video */}
      {spotifyId && <VideoSection spotifyId={spotifyId} videoUrl={s?.videoUrl} />}

      {/* Community insights */}
      {spotifyId && <CommunityInsightsPanel spotifyId={spotifyId} />}

      {/* Delete confirmation */}
      <BottomSheet open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Song löschen</h3>
            <p className="text-sm text-foreground-muted mt-1">
              Bist du sicher, dass du <strong>{title}</strong> löschen willst?
              Dein Lesezeichen wird entfernt.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => remove.mutate(song.id)}
              disabled={remove.isPending}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold
                         disabled:opacity-50 hover:bg-red-600 transition-colors"
            >
              {remove.isPending ? 'Entfernen…' : 'Ja, entfernen'}
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
