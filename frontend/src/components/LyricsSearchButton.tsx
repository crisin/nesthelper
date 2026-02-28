import { Search, X } from 'lucide-react'
import { useLyricsSearch } from '../hooks/useLyricsSearch'

export default function LyricsSearchButton() {
  const { handleSearch, isPending, error, clearError } = useLyricsSearch()

  return (
    <div className="space-y-1.5">
      <button
        onClick={handleSearch}
        disabled={isPending}
        className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-black font-semibold text-sm
                   hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-60"
      >
        <Search size={14} strokeWidth={2.25} />
        {isPending ? 'Lädt…' : 'Lyrics suchen'}
      </button>

      {error && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
          <span className="flex-1 text-[11px] text-red-400 leading-snug">{error}</span>
          <button onClick={clearError} className="flex-shrink-0 text-red-400 hover:text-red-300 transition-colors">
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  )
}
