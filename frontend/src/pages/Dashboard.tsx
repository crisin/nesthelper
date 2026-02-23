import LyricsSearch from '../components/LyricsSearch'

export default function Dashboard() {
  return (
    <div className="px-4 sm:px-8 py-8 max-w-2xl mx-auto">
      <div className="mb-5">
        <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1">Now Playing</p>
        <h2 className="text-base font-semibold text-foreground">Search Lyrics</h2>
      </div>
      <LyricsSearch />
    </div>
  )
}
