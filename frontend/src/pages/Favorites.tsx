import { useState, useMemo, useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  ChevronRight,
  ExternalLink,
  Eye,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
} from "lucide-react";
import api from "../services/api";
import type { SavedLyric } from "../types";
import SwipeToDelete from "../components/SwipeToDelete";
import PullToRefresh from "../components/PullToRefresh";
import TrackListItem from "../components/TrackListItem";
import DigestBanner from "../components/DigestBanner";

// ─── Viewer settings ──────────────────────────────────────────────────────────

type ViewerThemeKey = "auto" | "dark" | "warm" | "slate";
type ViewerFont = "sans" | "serif" | "mono";
type ViewerSpacing = "tight" | "normal" | "relaxed" | "loose";

interface ViewerSettings {
  theme:      ViewerThemeKey;
  font:       ViewerFont;
  spacing:    ViewerSpacing;
  fontSize:   number;
  fontWeight: number;
  customBg:   string;
  customText: string;
}

const VIEWER_KEY = "lyrics-viewer-settings";

const VIEWER_THEMES: Record<
  ViewerThemeKey,
  { label: string; swatch: string; bg: string; text: string; border: string }
> = {
  auto: { label: "Auto", swatch: "", bg: "", text: "", border: "" },
  dark: {
    label: "Nacht",
    swatch: "#151515",
    bg: "#0d0d0d",
    text: "#e8e8e8",
    border: "#2c2c2c",
  },
  warm: {
    label: "Sepia",
    swatch: "#c8a87a",
    bg: "#f2ece0",
    text: "#2a1a0a",
    border: "#d4c6aa",
  },
  slate: {
    label: "Slate",
    swatch: "#3a4f7a",
    bg: "#1a2035",
    text: "#bfcde0",
    border: "#253050",
  },
};

const VIEWER_FONTS: Record<ViewerFont, { label: string; stack: string }> = {
  sans: { label: "Sans", stack: "Inter, system-ui, sans-serif" },
  serif: { label: "Serif", stack: "Georgia, 'Times New Roman', serif" },
  mono: { label: "Mono", stack: "'Courier New', Courier, monospace" },
};

const VIEWER_SPACINGS: Record<ViewerSpacing, { label: string; lh: number }> = {
  tight: { label: "Eng", lh: 1.45 },
  normal: { label: "Normal", lh: 1.75 },
  relaxed: { label: "Weit", lh: 2.1 },
  loose: { label: "Locker", lh: 2.6 },
};

function loadViewerSettings(): ViewerSettings {
  try {
    const raw = localStorage.getItem(VIEWER_KEY);
    if (raw) return JSON.parse(raw) as ViewerSettings;
  } catch (e) {
    void e;
  }
  return { theme: "auto", font: "sans", spacing: "normal", fontSize: 1, fontWeight: 400, customBg: "", customText: "" };
}

// ─── Lyrics viewer overlay ────────────────────────────────────────────────────

function LyricsViewer({
  song,
  onClose,
}: {
  song: SavedLyric;
  onClose: () => void;
}) {
  const imgUrl = song.searchHistory?.imgUrl;
  const [s, setS] = useState<ViewerSettings>(loadViewerSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function set<K extends keyof ViewerSettings>(key: K, val: ViewerSettings[K]) {
    setS((prev) => {
      const next = { ...prev, [key]: val };
      try {
        localStorage.setItem(VIEWER_KEY, JSON.stringify(next));
      } catch {
        console.error("Failed to save viewer settings");
      }
      return next;
    });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const isAuto     = s.theme === "auto";
  const theme      = VIEWER_THEMES[s.theme];
  const fontStack  = VIEWER_FONTS[s.font].stack;
  const lineHeight = VIEWER_SPACINGS[s.spacing].lh;

  // Custom colors override theme
  const effectiveBg   = s.customBg   || (isAuto ? "" : theme.bg);
  const effectiveText = s.customText || (isAuto ? "" : theme.text);
  const borderColor   = isAuto ? "var(--color-edge)" : theme.border;

  const sheetStyle = {
    background: effectiveBg   || "var(--color-surface-raised)",
    color:      effectiveText || "var(--color-foreground)",
    fontFamily: fontStack,
  };

  const settingsStyle = {
    background:  effectiveBg || "var(--color-surface)",
    borderColor: borderColor,
  };

  const sizePillStyle = isAuto
    ? { background: "var(--color-surface)", border: "1px solid var(--color-edge)" }
    : { background: theme.border + "44",    border: `1px solid ${theme.border}` };

  function chipStyle(active: boolean) {
    if (active) {
      return isAuto
        ? { background: "var(--color-surface-overlay)", borderColor: "var(--color-edge)", opacity: 1 }
        : { background: theme.border + "55",            borderColor: theme.border,         opacity: 1 };
    }
    return { background: "transparent", borderColor: "transparent", opacity: 0.5 };
  }

  const sheetSizeClass = expanded
    ? "w-full sm:max-w-4xl sm:mx-4 max-h-[96vh]"
    : "w-full sm:max-w-2xl sm:mx-4 max-h-[88vh]";

  // Fallback hex values for <input type="color"> (needs valid hex, not CSS vars)
  const pickerBg   = s.customBg   || theme.bg   || "#f9f9f7";
  const pickerText = s.customText || theme.text || "#0e0e0e";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />

      {/* Sheet */}
      <div
        className={`relative z-10 ${sheetSizeClass} rounded-t-2xl sm:rounded-2xl border shadow-2xl flex flex-col transition-all duration-200`}
        style={{ ...sheetStyle, borderColor }}
      >
        {/* Drag handle — mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-8 h-1 rounded-full" style={{ background: borderColor + "66" }} />
        </div>

        {/* ── Header ── */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b flex-shrink-0" style={{ borderColor }}>
          {imgUrl && (
            <img src={imgUrl} alt={song.track} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{song.track}</p>
            <p className="text-xs truncate" style={{ opacity: 0.5 }}>{song.artists?.join(", ") || song.artist}</p>
          </div>

          {/* Font size pill */}
          <div className="flex items-center flex-shrink-0 rounded-lg p-0.5" style={sizePillStyle}>
            <button
              onClick={() => set("fontSize", Math.max(0.65, +(s.fontSize - 0.15).toFixed(2)))}
              disabled={s.fontSize <= 0.65}
              aria-label="Verkleinern"
              className="w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold disabled:opacity-25"
            >A−</button>
            <button
              onClick={() => set("fontSize", 1)}
              className="px-1.5 h-7 flex items-center text-[11px] tabular-nums min-w-[36px] justify-center"
              style={{ opacity: 0.55 }}
            >{Math.round(s.fontSize * 100)}%</button>
            <button
              onClick={() => set("fontSize", Math.min(2.5, +(s.fontSize + 0.15).toFixed(2)))}
              disabled={s.fontSize >= 2.5}
              aria-label="Vergrößern"
              className="w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold disabled:opacity-25"
            >A+</button>
          </div>

          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings((v) => !v)}
            aria-label="Einstellungen"
            className="hidden sm:flex flex-shrink-0 w-7 h-7 items-center justify-center rounded-lg"
            style={{ opacity: showSettings ? 1 : 0.45 }}
          >
            <SlidersHorizontal size={14} strokeWidth={1.75} />
          </button>

          {/* Expand toggle — desktop only */}
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Verkleinern" : "Vergrößern"}
            className="hidden sm:flex flex-shrink-0 w-7 h-7 items-center justify-center rounded-lg"
            style={{ opacity: 0.45 }}
          >
            {expanded
              ? <Minimize2 size={13} strokeWidth={1.75} />
              : <Maximize2 size={13} strokeWidth={1.75} />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ opacity: 0.45 }}
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* ── Settings panel ── */}
        {showSettings && (
          <div className="flex-shrink-0 px-4 py-3.5 border-b space-y-3" style={settingsStyle}>

            {/* Theme */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest w-14 flex-shrink-0" style={{ opacity: 0.38 }}>Thema</span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(VIEWER_THEMES) as ViewerThemeKey[]).map((key) => {
                  const t = VIEWER_THEMES[key];
                  return (
                    <button key={key} onClick={() => set("theme", key)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
                      style={chipStyle(s.theme === key)}
                    >
                      <span className="w-3 h-3 rounded-full flex-shrink-0 border" style={{
                        background: key === "auto" ? "conic-gradient(#e0e0e0 180deg, #1a1a1a 180deg)" : t.swatch,
                        borderColor: key === "auto" ? "var(--color-edge)" : t.swatch + "cc",
                      }} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest w-14 flex-shrink-0" style={{ opacity: 0.38 }}>Schrift</span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(VIEWER_FONTS) as ViewerFont[]).map((key) => {
                  const f = VIEWER_FONTS[key];
                  return (
                    <button key={key} onClick={() => set("font", key)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
                      style={{ ...chipStyle(s.font === key), fontFamily: f.stack }}
                    >{f.label}</button>
                  );
                })}
              </div>
            </div>

            {/* Spacing */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest w-14 flex-shrink-0" style={{ opacity: 0.38 }}>Abstand</span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(VIEWER_SPACINGS) as ViewerSpacing[]).map((key) => {
                  const sp = VIEWER_SPACINGS[key];
                  return (
                    <button key={key} onClick={() => set("spacing", key)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
                      style={chipStyle(s.spacing === key)}
                    >{sp.label}</button>
                  );
                })}
              </div>
            </div>

            {/* Font weight */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest w-14 flex-shrink-0" style={{ opacity: 0.38 }}>Stärke</span>
              <div className="flex items-center gap-2.5">
                <input
                  type="range" min="100" max="900" step="100"
                  value={s.fontWeight}
                  onChange={(e) => set("fontWeight", Number(e.target.value))}
                  className="w-36 h-0.5 accent-current cursor-pointer"
                />
                <span className="text-[11px] tabular-nums w-8" style={{ opacity: 0.5 }}>{s.fontWeight}</span>
              </div>
            </div>

            {/* Custom colors */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest w-14 flex-shrink-0" style={{ opacity: 0.38 }}>Farben</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ opacity: 0.75 }}>
                  <input type="color" value={pickerBg}
                    onChange={(e) => set("customBg", e.target.value)}
                    className="w-5 h-5 rounded-full cursor-pointer p-0 border-0"
                  />
                  BG
                  {s.customBg && (
                    <button onClick={() => set("customBg", "")} className="opacity-50 hover:opacity-100 transition-opacity">
                      <X size={10} strokeWidth={2} />
                    </button>
                  )}
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ opacity: 0.75 }}>
                  <input type="color" value={pickerText}
                    onChange={(e) => set("customText", e.target.value)}
                    className="w-5 h-5 rounded-full cursor-pointer p-0 border-0"
                  />
                  Text
                  {s.customText && (
                    <button onClick={() => set("customText", "")} className="opacity-50 hover:opacity-100 transition-opacity">
                      <X size={10} strokeWidth={2} />
                    </button>
                  )}
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── Lyrics ── */}
        <div className="flex-1 overflow-auto">
          <div className="px-6 py-6 sm:px-8 sm:py-8">
            {song.lyrics ? (
              <p
                className="whitespace-pre-wrap"
                style={{ fontSize: `${s.fontSize}rem`, lineHeight, fontWeight: s.fontWeight }}
              >
                {song.lyrics}
              </p>
            ) : (
              <p className="text-sm py-12 text-center" style={{ opacity: 0.4 }}>
                Noch keine Lyrics gespeichert.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type SortKey = "recent" | "artist" | "title";

function formatAdded(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Recent" },
  { key: "artist", label: "Artist" },
  { key: "title", label: "Title" },
];

export default function Favorites() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [viewingSong, setViewing] = useState<SavedLyric | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: songs = [], isLoading } = useQuery<SavedLyric[]>({
    queryKey: ["saved-lyrics-favorites"],
    queryFn: () =>
      api.get<SavedLyric[]>("/saved-lyrics/favorites").then((r) => r.data),
  });

  const unfavoriteSong = useMutation({
    mutationFn: (spotifyId: string) =>
      api.delete(`/saved-lyrics/favorite/${spotifyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-lyrics-favorites"] });
      queryClient.invalidateQueries({ queryKey: ["saved-lyrics"] });
    },
  });

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? songs.filter(
          (s) =>
            s.track.toLowerCase().includes(q) ||
            s.artist.toLowerCase().includes(q) ||
            s.lyrics?.toLowerCase().includes(q) ||
            s.tags?.some((t) => t.tag.includes(q)),
        )
      : [...songs];

    if (sort === "artist")
      list.sort((a, b) => a.artist.localeCompare(b.artist));
    else if (sort === "title")
      list.sort((a, b) => a.track.localeCompare(b.track));

    return list;
  }, [songs, query, sort]);

  const handleRefresh = useCallback(
    () =>
      queryClient.invalidateQueries({ queryKey: ["saved-lyrics-favorites"] }),
    [queryClient],
  );

  if (isLoading) {
    return (
      <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-3">
        <div className="h-4 w-32 rounded-full bg-surface-raised animate-pulse mb-5" />
        <div className="h-9 w-full rounded-lg bg-surface-raised animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 rounded-xl bg-surface-raised border border-edge animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-4 overflow-hidden">
          {/* Weekly digest */}
          <DigestBanner />

          {/* Header */}
          <div>
            <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1">
              Library
            </p>
            <h1 className="text-xl font-semibold text-foreground flex items-baseline gap-2">
              Favoriten
              {songs.length > 0 && (
                <span className="text-sm font-normal text-foreground-muted">
                  {songs.length}
                </span>
              )}
            </h1>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle pointer-events-none"
              strokeWidth={1.75}
            />
            <input
              type="text"
              placeholder="Track, Artist, Lyrics oder Tag…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-surface-raised border border-edge rounded-lg text-sm
                       placeholder:text-foreground-subtle focus:outline-none focus:border-foreground-muted/60
                       transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground transition-colors"
              >
                <X size={13} strokeWidth={1.75} />
              </button>
            )}
          </div>

          {/* Sort controls */}
          {songs.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-foreground-subtle font-medium mr-0.5">
                Sort:
              </span>
              {SORTS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className={[
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    sort === key
                      ? "bg-surface-overlay text-foreground"
                      : "text-foreground-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* List */}
          {songs.length === 0 ? (
            <p className="text-sm text-foreground-subtle py-4">
              Noch keine Favoriten — drücke ♡ auf einem Song.
            </p>
          ) : displayed.length === 0 ? (
            <p className="text-sm text-foreground-subtle py-4">
              Keine Songs für &ldquo;{query}&rdquo; gefunden.
            </p>
          ) : (
            <ul className="space-y-2">
              {displayed.map((song) => {
                const spotifyId =
                  song.spotifyId ?? song.searchHistory?.spotifyId;
                const imgUrl = song.searchHistory?.imgUrl;

                return (
                  <li key={song.id} className="min-w-0">
                    <SwipeToDelete
                      onDelete={() =>
                        spotifyId && unfavoriteSong.mutate(spotifyId)
                      }
                      disabled={unfavoriteSong.isPending || !spotifyId}
                    >
                      <TrackListItem
                        src={imgUrl}
                        track={song.track}
                        artist={song.artists?.join(", ") || song.artist}
                        size="md"
                        onCardClick={() => navigate(`/favorites/${song.id}`)}
                        meta={
                          <div className="flex items-center gap-2 pt-0.5">
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                                song.lyrics
                                  ? "bg-accent/10 text-accent"
                                  : "bg-surface-overlay text-foreground-subtle"
                              }`}
                            >
                              {song.lyrics ? "lyrics" : "empty"}
                            </span>
                            <span className="text-[11px] text-foreground-subtle">
                              {formatAdded(song.createdAt)}
                            </span>
                          </div>
                        }
                        actions={
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {spotifyId && (
                              <span
                                role="img"
                                aria-label="Open on Spotify"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(
                                    `https://open.spotify.com/track/${spotifyId}`,
                                    "_blank",
                                    "noopener,noreferrer",
                                  );
                                }}
                                className="w-8 h-8 flex items-center justify-center text-foreground-subtle hover:text-accent transition-colors cursor-pointer"
                              >
                                <ExternalLink size={13} strokeWidth={1.75} />
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewing(song);
                              }}
                              aria-label="Lyrics anzeigen"
                              className="w-8 h-8 flex items-center justify-center text-foreground-subtle hover:text-foreground transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              <Eye size={13} strokeWidth={1.75} />
                            </button>
                            <ChevronRight
                              size={15}
                              className="text-foreground-subtle group-hover:text-foreground-muted transition-colors"
                              strokeWidth={1.75}
                            />
                          </div>
                        }
                      />
                    </SwipeToDelete>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PullToRefresh>

      {viewingSong != null && (
        <LyricsViewer song={viewingSong} onClose={() => setViewing(null)} />
      )}
    </>
  );
}
