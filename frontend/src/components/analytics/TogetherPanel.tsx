import type { TogetherData } from '../../types'

const initials = (name: string | null, id: string) =>
  (name ?? id).trim().slice(0, 2).toUpperCase()

/**
 * Where the user's collection sits inside the group's.
 *
 * `mode` exists because a bookmark is created by merely searching for a song —
 * over all bookmarks "we both have this" says almost nothing, so favourites are
 * the default and the other mode carries a footnote.
 */
export default function TogetherPanel({
  data,
  meId,
  mode,
  onModeChange,
}: {
  data: TogetherData
  meId: string
  mode: 'favorites' | 'all'
  onModeChange: (mode: 'favorites' | 'all') => void
}) {
  const { me, users, rows, discovery, gates } = data

  const modeSwitch = (
    <div className="flex gap-1 mb-4">
      {(
        [
          ['favorites', 'Favoriten'],
          ['all', 'Alle Songs'],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          onClick={() => onModeChange(value)}
          className={[
            'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
            mode === value
              ? 'bg-surface-overlay text-foreground'
              : 'text-foreground-muted hover:text-foreground',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )

  if (gates.activeUsers < 2) {
    return (
      <>
        {modeSwitch}
        <p className="text-sm text-foreground-subtle py-2">
          Du bist bisher allein hier. Sobald jemand dazukommt, entsteht an dieser
          Stelle der Vergleich.
        </p>
      </>
    )
  }

  const segments = [
    { key: 'onlyMine', value: me.onlyMine, color: 'var(--color-accent)', label: 'nur bei dir' },
    {
      key: 'some',
      value: me.sharedWithSome,
      color: 'color-mix(in srgb, var(--color-accent) 50%, transparent)',
      label: 'mit einigen geteilt',
    },
    {
      key: 'all',
      value: me.sharedWithAll,
      color: 'var(--color-foreground-subtle)',
      label: 'haben alle',
    },
  ].filter((s) => s.value > 0)

  return (
    <div className="space-y-6">
      {modeSwitch}

      {/* Exclusivity headline */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-medium text-foreground tabular-nums">
            {me.exclusivityPct}%
          </span>
          <span className="text-sm text-foreground-muted">
            deiner {me.total} Songs hat sonst niemand
          </span>
        </div>
        {me.total > 0 && (
          <>
            <div className="flex h-5 rounded-full overflow-hidden gap-0.5 mt-3">
              {segments.map((segment) => (
                <div
                  key={segment.key}
                  style={{
                    width: `${(segment.value / me.total) * 100}%`,
                    background: segment.color,
                  }}
                  title={`${segment.label}: ${segment.value}`}
                />
              ))}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {segments.map((segment) => (
                <li key={segment.key} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: segment.color }}
                  />
                  <span className="text-[12px] text-foreground-muted">{segment.label}</span>
                  <span className="text-[11px] text-foreground-subtle tabular-nums">
                    {segment.value}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Pairwise overlap */}
      {me.overlaps.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-2">
            Gemeinsame Songs
          </p>
          <ul className="space-y-1.5">
            {me.overlaps.map((overlap) => {
              const max = me.overlaps[0]?.sharedSongs || 1
              return (
                <li key={overlap.userId} className="flex items-center gap-3">
                  <span className="w-20 sm:w-28 text-[12px] text-foreground-muted truncate flex-shrink-0 text-right">
                    {overlap.name ?? 'Ohne Namen'}
                  </span>
                  <div className="flex-1 h-4 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${(overlap.sharedSongs / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-[11px] text-foreground-subtle text-right tabular-nums flex-shrink-0">
                    {overlap.sharedSongs}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Who-has-whom grid. Dots rather than a Venn: it stays readable past three people. */}
      {rows.length >= 3 ? (
        <div>
          <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-2">
            Künstler, die ihr teilt
          </p>
          <div className="flex items-center gap-1 mb-1.5 pl-[7.5rem] sm:pl-[9.5rem]">
            {users.map((user) => (
              <span
                key={user.id}
                title={user.name ?? user.id}
                className={[
                  'w-3 text-[9px] text-center flex-shrink-0',
                  user.id === meId ? 'text-accent font-semibold' : 'text-foreground-subtle',
                ].join(' ')}
              >
                {initials(user.name, user.id)[0]}
              </span>
            ))}
          </div>
          <ul className="space-y-1">
            {rows.map((row) => (
              <li key={row.artist} className="flex items-center gap-1">
                <span className="w-28 sm:w-36 text-[12px] text-foreground-muted truncate flex-shrink-0 text-right pr-2">
                  {row.artist}
                </span>
                {users.map((user) => {
                  const has = row.userIds.includes(user.id)
                  return (
                    <span
                      key={user.id}
                      title={`${user.name ?? user.id}: ${has ? 'hat' : 'hat nicht'}`}
                      className={[
                        'w-3 h-3 rounded-full flex-shrink-0',
                        has ? 'bg-accent' : 'bg-surface border border-edge',
                        user.id === meId && has ? 'ring-1 ring-accent/40' : '',
                      ].join(' ')}
                    />
                  )
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-foreground-subtle">
          Ihr habt noch kaum Künstler gemeinsam — deine Sammlung gehört bisher
          ganz dir allein.
        </p>
      )}

      {/* Discovery */}
      {discovery.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1">
            Zuerst gespeichert
          </p>
          <p className="text-[11px] text-foreground-subtle mb-2">
            Wer einen Song als Erster hatte, den später noch jemand gespeichert hat.
          </p>
          <ul className="space-y-1.5">
            {discovery.slice(0, 6).map((entry) => {
              const max = discovery[0]?.firstCount || 1
              return (
                <li key={entry.userId} className="flex items-center gap-3">
                  <span className="w-20 sm:w-28 text-[12px] text-foreground-muted truncate flex-shrink-0 text-right">
                    {entry.name ?? 'Ohne Namen'}
                  </span>
                  <div className="flex-1 h-4 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent/60"
                      style={{ width: `${(entry.firstCount / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-[11px] text-foreground-subtle text-right tabular-nums flex-shrink-0">
                    {entry.firstCount}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {mode === 'all' && (
        <p className="text-[11px] text-foreground-subtle">
          Im Modus „Alle Songs" zählen auch Songs mit, die nur gesucht und nie
          bewusst gespeichert wurden.
        </p>
      )}
    </div>
  )
}
