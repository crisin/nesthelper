import LyricsSearch from '../components/LyricsSearch'
import SavedLyrics from '../components/SavedLyrics'

export default function Dashboard() {
  return (
    <div className="px-4 sm:px-6 py-8 max-w-3xl mx-auto space-y-10">
      <section>
        <h2 className="text-xs font-semibold text-app-faint uppercase tracking-widest mb-4">Now Playing</h2>
        <LyricsSearch />
      </section>
      <section>
        <SavedLyrics />
      </section>
    </div>
  )
}
