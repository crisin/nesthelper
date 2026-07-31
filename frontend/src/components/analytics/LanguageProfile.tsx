import type { LanguageProfile as Profile } from '../../types'

const LANGUAGE_LABEL: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  unknown: 'Gemischt / unklar',
}

/** One hue per language, from the validated categorical palette. */
const LANGUAGE_COLOR: Record<string, string> = {
  de: 'var(--chart-1)',
  en: 'var(--chart-2)',
  unknown: 'var(--color-foreground-subtle)',
}

export default function LanguageProfile({ data }: { data: Profile }) {
  const total = data.languages.reduce((sum, entry) => sum + entry.songs, 0)

  if (data.songsWithLyrics === 0) {
    return (
      <p className="text-sm text-foreground-subtle py-4">
        Noch keine Lyrics gespeichert — hier entsteht dein Sprachprofil, sobald
        die ersten Songtexte da sind.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {/* Language split — one stacked bar, directly labelled */}
      {total > 0 && (
        <div>
          <div className="flex h-6 rounded-full overflow-hidden gap-0.5">
            {data.languages.map((entry) => (
              <div
                key={entry.language}
                style={{
                  width: `${(entry.songs / total) * 100}%`,
                  background: LANGUAGE_COLOR[entry.language],
                }}
                title={`${LANGUAGE_LABEL[entry.language]}: ${entry.songs}`}
              />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {data.languages.map((entry) => (
              <li key={entry.language} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: LANGUAGE_COLOR[entry.language] }}
                />
                <span className="text-[12px] text-foreground-muted">
                  {LANGUAGE_LABEL[entry.language]}
                </span>
                <span className="text-[11px] text-foreground-subtle tabular-nums">
                  {Math.round((entry.songs / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Signature words */}
      {data.signatures.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1">
            Signatur-Wörter
          </p>
          <p className="text-[11px] text-foreground-subtle mb-3">
            Wörter, die diesem Künstler gehören statt deiner Sammlung insgesamt —
            gewichtet danach, wie selten sie bei den anderen vorkommen.
          </p>
          <ul className="space-y-3">
            {data.signatures.map((signature) => (
              <li key={signature.artist}>
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="text-[13px] font-medium text-foreground truncate">
                    {signature.artist}
                  </span>
                  <span className="text-[10px] text-foreground-subtle tabular-nums flex-shrink-0">
                    {signature.songs} {signature.songs === 1 ? 'Song' : 'Songs'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {signature.words.map((word) => (
                    <span
                      key={word.word}
                      title={`${word.count}×`}
                      className="px-2 py-0.5 rounded-full border border-edge bg-surface
                                 text-[11px] text-foreground-muted"
                    >
                      {word.word}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-foreground-subtle">
          Für Signatur-Wörter braucht es mindestens zwei Künstler mit je zwei
          Songs mit Lyrics.
        </p>
      )}
    </div>
  )
}
