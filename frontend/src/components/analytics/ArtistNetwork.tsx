import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ArtistGraph, EdgeKind, GraphEdge } from '../../types'

/** Cluster colours come from the validated categorical palette, by community index. */
const clusterColor = (community: number) => `var(--chart-${(community % 8) + 1})`

const KIND_LABEL: Record<EdgeKind, string> = {
  feature: 'gemeinsamer Song',
  session: 'zusammen gehört',
  tag: 'gleicher Tag',
  collection: 'gleiche Sammlung',
}

/** The signal that contributed most to an edge — decides its line style. */
function dominantKind(edge: GraphEdge): EdgeKind {
  const order: EdgeKind[] = ['feature', 'session', 'tag', 'collection']
  return order.reduce((best, kind) => (edge.by[kind] > edge.by[best] ? kind : best), 'feature')
}

const DASH: Record<EdgeKind, string | undefined> = {
  feature: undefined,
  session: '1 3',
  tag: '5 3',
  collection: '4 3',
}

// ─── Desktop: the graph ──────────────────────────────────────────────────────

function ForceGraphSvg({
  data,
  focus,
  onFocus,
}: {
  data: ArtistGraph
  focus: string | null
  onFocus: (id: string | null) => void
}) {
  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes])

  const neighbours = useMemo(() => {
    if (!focus) return null
    const set = new Set<string>([focus])
    for (const edge of data.edges) {
      if (edge.a === focus) set.add(edge.b)
      if (edge.b === focus) set.add(edge.a)
    }
    return set
  }, [focus, data.edges])

  // Only the best-connected nodes get a permanent label, or the graph turns
  // into a wall of text.
  const labelled = useMemo(() => {
    const top = [...data.nodes].sort((a, b) => b.degree - a.degree).slice(0, 10)
    return new Set(top.map((n) => n.id))
  }, [data.nodes])

  const dim = (id: string) => (neighbours && !neighbours.has(id) ? 0.12 : 1)

  return (
    <svg
      viewBox="0 0 800 560"
      className="w-full h-auto select-none"
      role="img"
      aria-label={`Netz aus ${data.nodes.length} Künstlern`}
      onClick={() => onFocus(null)}
    >
      {/* Edges first — SVG has no z-index, so painting order is the only layering */}
      <g>
        {data.edges.map((edge) => {
          const a = byId.get(edge.a)
          const b = byId.get(edge.b)
          if (!a || !b) return null
          const visible =
            !neighbours || (neighbours.has(edge.a) && neighbours.has(edge.b))
          const kind = dominantKind(edge)
          return (
            <line
              key={`${edge.a}--${edge.b}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="currentColor"
              className="text-foreground-subtle"
              strokeOpacity={visible ? 0.45 : 0.06}
              strokeWidth={0.5 + edge.weight * 3}
              strokeDasharray={DASH[kind]}
            />
          )
        })}
      </g>

      <g>
        {data.nodes.map((node) => {
          const r = 4 + Math.sqrt(node.songCount) * 2.2
          return (
            <g
              key={node.id}
              opacity={dim(node.id)}
              onClick={(e) => {
                e.stopPropagation()
                onFocus(node.id === focus ? null : node.id)
              }}
              className="cursor-pointer"
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={r}
                fill={clusterColor(node.community)}
                stroke="var(--color-surface-raised)"
                strokeWidth={2}
              />
              {(labelled.has(node.id) || node.id === focus) && (
                <text
                  x={node.x}
                  y={node.y - r - 5}
                  textAnchor="middle"
                  fontSize={11}
                  className="fill-foreground"
                  stroke="var(--color-surface-raised)"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {node.name}
                </text>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}

// ─── Mobile: the ego list ────────────────────────────────────────────────────

function EgoList({
  data,
  center,
  onCenter,
}: {
  data: ArtistGraph
  center: string
  onCenter: (id: string) => void
}) {
  const rows = useMemo(() => {
    const out: { name: string; weight: number; kinds: EdgeKind[]; titles: string[] }[] = []
    for (const edge of data.edges) {
      const other = edge.a === center ? edge.b : edge.b === center ? edge.a : null
      if (!other) continue
      const kinds = (Object.keys(edge.by) as EdgeKind[]).filter((k) => edge.by[k] > 0)
      out.push({ name: other, weight: edge.weight, kinds, titles: edge.sampleTitles })
    }
    return out.sort((a, b) => b.weight - a.weight).slice(0, 12)
  }, [data.edges, center])

  const max = rows[0]?.weight ?? 1

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {[...data.nodes]
          .sort((a, b) => b.degree - a.degree)
          .slice(0, 8)
          .map((node) => (
            <button
              key={node.id}
              onClick={() => onCenter(node.id)}
              className={[
                'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                node.id === center
                  ? 'bg-accent/12 border-accent/40 text-accent'
                  : 'border-edge text-foreground-muted active:bg-surface-overlay',
              ].join(' ')}
            >
              {node.name}
            </button>
          ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-foreground-subtle py-2">
          {center} steht noch für sich allein.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <li key={row.name}>
              <button
                onClick={() => onCenter(row.name)}
                className="w-full text-left active:bg-surface-overlay rounded-lg px-1 py-1 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-[13px] text-foreground truncate">
                    {row.name}
                  </span>
                  <span className="text-[10px] text-foreground-subtle flex-shrink-0">
                    {row.kinds.map((k) => KIND_LABEL[k]).join(' · ')}
                  </span>
                </div>
                <div className="mt-1 h-1.5 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(row.weight / max) * 100}%` }}
                  />
                </div>
                {row.titles.length > 0 && (
                  <p className="text-[10px] text-foreground-subtle mt-1 truncate">
                    {row.titles.join(', ')}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export default function ArtistNetwork({ data }: { data: ArtistGraph }) {
  const topNode = useMemo(
    () => [...data.nodes].sort((a, b) => b.degree - a.degree)[0] ?? null,
    [data.nodes],
  )
  const [focus, setFocus] = useState<string | null>(null)
  const [center, setCenter] = useState<string | null>(null)

  if (data.nodes.length < 4) {
    return (
      <p className="text-sm text-foreground-subtle py-4">
        Noch zu wenig Verbindungen für ein Netz. Es entsteht von selbst, sobald
        mehr Songs Features haben, getaggt oder in Sammlungen einsortiert sind.
      </p>
    )
  }

  const active = focus ?? center ?? topNode?.id ?? null
  const focusNeighbours = active
    ? data.edges
        .filter((e) => e.a === active || e.b === active)
        .map((e) => (e.a === active ? e.b : e.a))
    : []

  return (
    <div className="space-y-5">
      {/* Desktop graph */}
      <div className="hidden sm:block rounded-xl bg-surface border border-edge p-2">
        <ForceGraphSvg data={data} focus={focus} onFocus={setFocus} />
      </div>

      {focus && (
        <p className="hidden sm:block text-[11px] text-foreground-muted">
          <span className="text-foreground font-medium">{focus}</span> hängt an{' '}
          {focusNeighbours.length}{' '}
          {focusNeighbours.length === 1 ? 'Künstler' : 'Künstlern'}:{' '}
          {focusNeighbours.slice(0, 8).join(', ')}
          {focusNeighbours.length > 8 ? ' …' : ''}
        </p>
      )}

      {/* Mobile ego list */}
      <div className="sm:hidden">
        <EgoList
          data={data}
          center={center ?? topNode?.id ?? ''}
          onCenter={setCenter}
        />
      </div>

      {/* Cluster legend — identity is never colour-alone */}
      {data.clusters.length > 1 && (
        <div>
          <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-2">
            Gruppen im Netz
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {data.clusters.slice(0, 8).map((cluster) => (
              <li key={cluster.id} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: clusterColor(cluster.id) }}
                />
                <span className="text-[12px] text-foreground-muted">
                  {cluster.label ?? `Gruppe ${cluster.id + 1}`}
                </span>
                <span className="text-[11px] text-foreground-subtle tabular-nums">
                  {cluster.size}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bridges */}
      {data.bridges.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-2">
            Brückenbauer
          </p>
          <p className="text-[11px] text-foreground-subtle mb-2">
            Künstler, über die sonst getrennte Ecken deiner Sammlung
            zusammenhängen.
          </p>
          <ul className="space-y-1.5">
            {data.bridges.slice(0, 5).map((bridge) => (
              <li key={bridge.id} className="flex items-center gap-3">
                <span className="w-28 sm:w-36 text-[12px] text-foreground-muted truncate flex-shrink-0 text-right">
                  {bridge.name}
                </span>
                <div className="flex-1 h-4 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${bridge.betweenness * 100}%` }}
                  />
                </div>
                <span className="hidden sm:block w-32 text-[10px] text-foreground-subtle truncate">
                  {bridge.connects.slice(0, 2).join(' ↔ ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-foreground-subtle">
        {data.nodes.length} verbundene Künstler · {data.edges.length} Verbindungen ·{' '}
        {data.stats.soloArtists} ohne Verbindung
        {data.stats.components > 1 && ` · ${data.stats.components} getrennte Inseln`}
      </p>

      <Link
        to="/discover"
        className="inline-block text-[11px] text-foreground-muted hover:text-accent transition-colors"
      >
        Zur Songbibliothek →
      </Link>
    </div>
  )
}
