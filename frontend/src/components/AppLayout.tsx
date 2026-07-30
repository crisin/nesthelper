import {
  BarChart2,
  BookOpen,
  Bug,
  ChevronRight,
  Clock,
  Compass,
  Home,
  Library,
  Lightbulb,
  MoreHorizontal,
  Music2,
  Settings,
  Users,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useNowPlaying } from "../hooks/useNowPlaying";
import { useAuthStore } from "../stores/authStore";
import { useVisualStore } from "../stores/visualStore";
import BottomSheet from "./BottomSheet";
import DynamicBackground from "./DynamicBackground";
import FeatureRequestPanel, { type PanelMode } from "./FeatureRequestPanel";
import LyricsSearchButton from "./LyricsSearchButton";
import Notifications from "./Notifications";
import NowPlayingBar from "./NowPlayingBar";
import NowPlayingWidget from "./NowPlayingWidget";
import SpotifyConnect from "./SpotifyConnect";
import UsernameEdit from "./UsernameEdit";

function getPageKey(pathname: string): string | null {
  if (pathname === '/dashboard') return 'dashboard'
  if (pathname === '/discover') return 'discover'
  if (pathname.startsWith('/favorites')) return 'favorites'
  if (pathname === '/timeline') return 'timeline'
  if (pathname === '/settings') return 'settings'
  if (pathname.startsWith('/songs/')) return 'song'
  return null
}

type NavItem = { path: string; label: string; Icon: typeof Home };

/** The four that earn a slot in the mobile bar. */
const PRIMARY_NAV: NavItem[] = [
  { path: "/dashboard", label: "Start", Icon: Home },
  { path: "/discover", label: "Entdecken", Icon: Compass },
  { path: "/favorites", label: "Favoriten", Icon: Library },
  { path: "/collections", label: "Sammlungen", Icon: BookOpen },
];

/** Everything else — behind "Mehr" on mobile, inline in the desktop sidebar. */
const SECONDARY_NAV: NavItem[] = [
  { path: "/library", label: "Spotify-Import", Icon: Music2 },
  { path: "/analytics", label: "Statistiken", Icon: BarChart2 },
  { path: "/timeline", label: "Erinnerungen", Icon: Clock },
  { path: "/settings", label: "Einstellungen", Icon: Settings },
];

const ADMIN_NAV: NavItem = { path: "/admin", label: "Nutzer", Icon: Users };

/** `/favorites/x` should light up `/favorites`, but `/` must not light up everything. */
function isActive(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode | null>(null);
  const visualEnabled = useVisualStore((s) => s.enabled);
  const isAdmin = useAuthStore((s) => s.user?.role) === "ADMIN";
  const pageKey = getPageKey(location.pathname);
  // Same shared query the widget and the bar use — no extra request, but the
  // layout needs to know whether the mobile bar takes up space.
  const { data: currentTrack } = useNowPlaying();
  const hasNowPlaying = !!currentTrack?.item;

  // Without this, tapping the 20th song in a list opens its page already
  // scrolled into the middle of the lyrics.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const secondaryNav = isAdmin ? [...SECONDARY_NAV, ADMIN_NAV] : SECONDARY_NAV;
  // The sidebar has the room to stay flat; only the phone needs the split.
  const sidebarNav = [...PRIMARY_NAV, ...secondaryNav];
  const moreActive = secondaryNav.some((n) => isActive(location.pathname, n.path));

  return (
    <div
      className={`min-h-screen text-foreground flex ${visualEnabled ? "" : "bg-surface"}`}
    >
      <Notifications />
      <DynamicBackground pageKey={pageKey} />
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
          {sidebarNav.map(({ path, label, Icon }) => {
            const active = isActive(location.pathname, path);
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
          {/* The widget above is the way to the song page now; this is only
              here for when nothing is playing at all. */}
          {!hasNowPlaying && <LyricsSearchButton />}
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
      <main
        className={`flex-1 sm:ml-56 ${hasNowPlaying ? "pb-40" : "pb-24"} sm:pb-0 mb-safe sm:mb-0 min-h-screen overflow-x-hidden`}
      >
        {children}
      </main>

      {/* ── FAB ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => setPickerOpen((v) => !v)}
        className={`fixed ${hasNowPlaying ? "bottom-36" : "bottom-20"} right-4 sm:bottom-6 sm:right-6 z-40 w-12 h-12 rounded-full bg-accent text-black flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity`}
        title="Feedback"
      >
        <Lightbulb size={20} strokeWidth={2} />
      </button>

      {/* Picker popup */}
      {pickerOpen && !panelMode && (
        <>
          <div
            className="fixed inset-0 z-40 sm:hidden"
            onClick={() => setPickerOpen(false)}
          />
          <div
            className={`fixed ${hasNowPlaying ? "bottom-52" : "bottom-36"} right-4 sm:bottom-[88px] sm:right-6 z-50 flex flex-col gap-2 items-end`}
          >
            <button
              onClick={() => {
                setPanelMode("bug");
                setPickerOpen(false);
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-surface-raised border border-orange-500/30 shadow-xl text-sm font-medium text-orange-400 hover:bg-orange-500/10 transition-colors"
            >
              <Bug size={15} strokeWidth={1.75} />
              Bug melden
            </button>
            <button
              onClick={() => {
                setPanelMode("feature");
                setPickerOpen(false);
              }}
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
        {/* Sits inside the nav so it stacks above it without magic offsets */}
        <NowPlayingBar />
        <div className="h-16 flex">
          {PRIMARY_NAV.map(({ path, label, Icon }) => {
            const active = isActive(location.pathname, path);
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

          {/* Fifth slot. Eight items meant ~47px each on a 375px screen, which
              is below the tap-target minimum and clipped the longer labels. */}
          <button
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-label="Weitere Bereiche"
            className={[
              "flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] transition-colors active:scale-95",
              moreActive ? "text-accent" : "text-foreground-muted",
            ].join(" ")}
          >
            <MoreHorizontal size={20} strokeWidth={moreActive ? 2.25 : 1.75} />
            <span className="text-[10px] font-medium">Mehr</span>
          </button>
        </div>
        {/* Safe area spacer for notched devices */}
        <div className="pb-safe" />
      </nav>

      {/* ── "Mehr" sheet (mobile only) ────────────────────────────── */}
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)}>
        <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-3">
          Mehr
        </p>
        <div className="space-y-0.5 -mx-2">
          {secondaryNav.map(({ path, label, Icon }) => {
            const active = isActive(location.pathname, path);
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setMoreOpen(false)}
                className={[
                  "flex items-center gap-3 px-2 py-3 min-h-[48px] rounded-lg text-sm font-medium transition-colors active:bg-surface-overlay",
                  active
                    ? "bg-surface-overlay text-foreground"
                    : "text-foreground-muted",
                ].join(" ")}
              >
                <Icon size={17} strokeWidth={active ? 2.25 : 1.75} />
                <span className="flex-1">{label}</span>
                <ChevronRight
                  size={15}
                  strokeWidth={1.75}
                  className="text-foreground-subtle"
                />
              </Link>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}
