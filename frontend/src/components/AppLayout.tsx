import { BarChart2, Clock, Compass, Home, Library, Settings, BookOpen, ArrowRight, Music2, Lightbulb, Bug } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useVisualStore } from "../stores/visualStore";
import FeatureRequestPanel, { type PanelMode } from "./FeatureRequestPanel";
import { useQuery } from "@tanstack/react-query";
import SpotifyConnect from "./SpotifyConnect";
import UsernameEdit from "./UsernameEdit";
import LyricsSearchButton from "./LyricsSearchButton";
import NowPlayingWidget from "./NowPlayingWidget";
import api from "../services/api";
import type { SpotifyCurrentlyPlayingResponse, Song } from "../types";

/** Shows "View Song" if the currently playing track is in the DB, else falls back to LyricsSearchButton */
function SongAction() {
  // Subscribe to the same key NowPlayingWidget polls — React Query deduplicates the fetch
  const { data: currentTrack } = useQuery<SpotifyCurrentlyPlayingResponse | null>({
    queryKey: ["spotify-current-track"],
    queryFn: () =>
      api.get<SpotifyCurrentlyPlayingResponse>("/spotify/current-track").then((r) => r.data),
    refetchInterval: 5_000,
    staleTime: 0,
    retry: false,
  });
  const spotifyId = currentTrack?.item?.id;

  const { data: song } = useQuery<Song | null>({
    queryKey: ["song", spotifyId],
    queryFn: () =>
      api.get<Song>(`/songs/${spotifyId}`).then((r) => r.data).catch(() => null),
    enabled: !!spotifyId,
    staleTime: 60_000,
    retry: false,
  });

  if (song) {
    return (
      <Link
        to={`/songs/${spotifyId}`}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent text-black font-semibold text-sm hover:opacity-90 transition-opacity active:scale-[0.98]"
      >
        Song ansehen
        <ArrowRight size={14} strokeWidth={2.25} />
      </Link>
    );
  }

  return <LyricsSearchButton />;
}

const NAV = [
  { path: "/dashboard", label: "Dashboard", Icon: Home },
  { path: "/discover", label: "Entdecken", Icon: Compass },
  { path: "/favorites", label: "Favoriten", Icon: Library },
  { path: "/collections", label: "Collections", Icon: BookOpen },
  { path: "/library", label: "Bibliothek", Icon: Music2 },
  { path: "/analytics", label: "Analytics", Icon: BarChart2 },
  { path: "/timeline", label: "Timeline", Icon: Clock },
  { path: "/settings", label: "Einstellungen", Icon: Settings },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode | null>(null);
  const visualEnabled = useVisualStore((s) => s.enabled);

  return (
    <div className={`min-h-screen text-foreground flex ${visualEnabled ? '' : 'bg-surface'}`}>
      {/* ── Sidebar (desktop only) ──────────────────────────────── */}
      <div className="hidden sm:flex fixed inset-y-0 left-0 z-40 w-56 flex-col bg-surface-raised border-r border-edge">
        {/* Logo */}
        <div className="px-4 h-14 flex items-center flex-shrink-0 border-b border-edge">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 select-none"
          >
            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
              <img src="/glorp-1x.webp" />
            </span>
            <span className="text-foreground font-semibold text-sm tracking-tight">
              Lyrics Helper
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ path, label, Icon }) => {
            const active =
              path === "/favorites" || path === "/collections"
                ? location.pathname.startsWith(path)
                : location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={[
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-surface-overlay text-foreground"
                    : "text-foreground-muted hover:bg-surface-overlay/70 hover:text-foreground",
                ].join(" ")}
              >
                <Icon size={15} strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 flex-shrink-0 space-y-3">
          <NowPlayingWidget />
          <SongAction />
        </div>
        {/* User controls */}
        <div className="px-4 py-4 border-t border-edge flex-shrink-0 space-y-3">
          
          <SpotifyConnect />
          <UsernameEdit />
          {/* <div className="flex items-center justify-between pt-0.5">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors"
            >
              <LogOut size={12} strokeWidth={1.75} />
              Sign out
            </button>
            <button
              onClick={toggle}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-muted hover:bg-surface-overlay hover:text-foreground transition-colors"
            >
              {isDark ? <Sun size={14} strokeWidth={1.75} /> : <Moon size={14} strokeWidth={1.75} />}
            </button>
          </div> */}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <main className="flex-1 sm:ml-56 pb-24 sm:pb-0 mb-safe sm:mb-0 min-h-screen overflow-x-hidden">
        {children}
      </main>

      {/* ── FAB ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => setPickerOpen((v) => !v)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 w-12 h-12 rounded-full bg-accent text-black flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
        title="Feedback"
      >
        <Lightbulb size={20} strokeWidth={2} />
      </button>

      {/* Picker popup */}
      {pickerOpen && !panelMode && (
        <>
          <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setPickerOpen(false)} />
          <div className="fixed bottom-36 right-4 sm:bottom-[88px] sm:right-6 z-50 flex flex-col gap-2 items-end">
            <button
              onClick={() => { setPanelMode('bug'); setPickerOpen(false) }}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-surface-raised border border-orange-500/30 shadow-xl text-sm font-medium text-orange-400 hover:bg-orange-500/10 transition-colors"
            >
              <Bug size={15} strokeWidth={1.75} />
              Bug melden
            </button>
            <button
              onClick={() => { setPanelMode('feature'); setPickerOpen(false) }}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-surface-raised border border-edge shadow-xl text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-surface-overlay transition-colors"
            >
              <Lightbulb size={15} strokeWidth={1.75} />
              Feature wünschen
            </button>
          </div>
        </>
      )}

      {panelMode && (
        <FeatureRequestPanel
          mode={panelMode}
          onClose={() => setPanelMode(null)}
        />
      )}

      {/* ── Bottom nav (mobile only) ──────────────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 flex flex-col bg-surface-raised border-t border-edge">
        <div className="h-16 flex">
          {NAV.map(({ path, label, Icon }) => {
            const active =
              path === "/favorites" || path === "/collections"
                ? location.pathname.startsWith(path)
                : location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={[
                  "flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] transition-colors active:scale-95",
                  active ? "text-accent" : "text-foreground-muted",
                ].join(" ")}
              >
                <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
        {/* Safe area spacer for notched devices */}
        <div className="pb-safe" />
      </nav>
    </div>
  );
}
