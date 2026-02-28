import { BarChart2, Compass, Home, Library, Settings, BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import SpotifyConnect from "./SpotifyConnect";
import UsernameEdit from "./UsernameEdit";

const NAV = [
  { path: "/dashboard", label: "Dashboard", Icon: Home },
  { path: "/discover", label: "Entdecken", Icon: Compass },
  { path: "/songs", label: "Songs", Icon: Library },
  { path: "/collections", label: "Collections", Icon: BookOpen },
  { path: "/analytics", label: "Analytics", Icon: BarChart2 },
  { path: "/settings", label: "Einstellungen", Icon: Settings },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  // const navigate  = useNavigate()
  // const clearAuth = useAuthStore((s) => s.clearAuth)
  // const { isDark, toggle } = useTheme()

  // function handleLogout() {
  //   clearAuth()
  //   navigate('/login')
  // }

  return (
    <div className="min-h-screen bg-surface text-foreground flex">
      {/* ── Sidebar (desktop only) ──────────────────────────────── */}
      <div className="hidden sm:flex fixed inset-y-0 left-0 z-40 w-56 flex-col bg-surface-raised border-r border-edge">
        {/* Logo */}
        <div className="px-4 h-14 flex items-center flex-shrink-0 border-b border-edge">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 select-none"
          >
            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
              {/* <Music size={14} className="text-accent" strokeWidth={2} /> */}
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
              path === "/songs" || path === "/collections"
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

      {/* ── Bottom nav (mobile only) ──────────────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 flex flex-col bg-surface-raised border-t border-edge">
        <div className="h-16 flex">
          {NAV.map(({ path, label, Icon }) => {
            const active =
              path === "/songs" || path === "/collections"
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
