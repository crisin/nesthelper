import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import api from '../services/api'
import type { SongTag } from '../types'

const PRESET_TAGS = [
  'gym', 'night drive', 'morning', 'road trip', 'study',
  'breakup', 'rain', 'summer', 'nostalgia', 'party',
]

interface Props {
  savedLyricId: string
  tags: SongTag[]
}

export default function TagSelector({ savedLyricId, tags }: Props) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] })

  const addTag = useMutation({
    mutationFn: (tag: string) =>
      api.post(`/saved-lyrics/${savedLyricId}/tags`, { tag }).then((r) => r.data),
    onSuccess: invalidate,
  })

  const removeTag = useMutation({
    mutationFn: (tag: string) =>
      api.delete(`/saved-lyrics/${savedLyricId}/tags/${encodeURIComponent(tag)}`),
    onSuccess: invalidate,
  })

  function submit(tag: string) {
    const t = tag.trim().toLowerCase()
    if (!t || tags.some((x) => x.tag === t)) return
    addTag.mutate(t)
    setInput('')
    setOpen(false)
  }

  const suggestions = PRESET_TAGS.filter(
    (p) => !tags.some((t) => t.tag === p) && p.includes(input.toLowerCase()),
  )

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                     bg-accent/10 text-accent text-[11px] font-medium"
        >
          {t.tag}
          <button
            onClick={() => removeTag.mutate(t.tag)}
            className="opacity-60 hover:opacity-100 transition-opacity -mr-0.5"
            aria-label={`Remove tag ${t.tag}`}
          >
            <X size={9} strokeWidth={2.5} />
          </button>
        </span>
      ))}

      {open ? (
        <div className="relative">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); submit(input) }
              if (e.key === 'Escape') { setOpen(false); setInput('') }
            }}
            onBlur={() => { if (!input) setOpen(false) }}
            placeholder="Add tag…"
            className="w-28 px-2 py-0.5 rounded-full border border-accent/40 bg-surface text-[11px]
                       text-foreground focus:outline-none focus:border-accent placeholder:text-foreground-subtle"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full mt-1 left-0 z-50 bg-surface-overlay border border-edge
                            rounded-xl shadow-lg py-1 min-w-[140px]">
              {suggestions.slice(0, 6).map((s) => (
                <button
                  key={s}
                  onMouseDown={() => submit(s)}
                  className="w-full text-left px-3 py-1.5 text-xs text-foreground-muted
                             hover:bg-surface-raised hover:text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-dashed
                     border-edge text-foreground-subtle text-[11px] hover:border-foreground-muted/50
                     hover:text-foreground-muted transition-colors"
        >
          <Plus size={9} strokeWidth={2.5} />
          Tag
        </button>
      )}
    </div>
  )
}
