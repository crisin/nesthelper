import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useTheme } from '../hooks/useTheme'
import SpotifyConnect from './SpotifyConnect'
import UsernameEdit from './UsernameEdit'

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden>
      <path d="M3 12L12 3l9 9v9H15v-6H9v6H3z" />
    </svg>
  )
}

function DiscoverIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

const NAV = [
  { path: '/dashboard', label: 'Home',     Icon: HomeIcon },
  { path: '/discover',  label: 'Discover', Icon: DiscoverIcon },
]

export default function AppLayout({ children }: { children: ReactNode }) {
  const location  = useLocation()
  const navigate  = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const { isDark, toggle } = useTheme()

  function handleLogout() {
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-ink flex">

      {/* ── Sidebar (desktop only) ──────────────────────────────── */}
      <aside className="hidden sm:flex fixed inset-y-0 left-0 z-40 w-52 flex-col bg-app-card border-r border-app-edge">

        {/* Logo */}
        <div className="px-5 h-14 flex items-center flex-shrink-0">
          <Link to="/dashboard" className="text-spotify-green font-semibold text-sm tracking-tight select-none">
            Lyrics Helper
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ path, label, Icon }) => {
            const active = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={[
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  'border-l-2 pl-[10px]',
                  active
                    ? 'bg-app-input text-app-ink border-spotify-green'
                    : 'text-app-muted hover:bg-app-input hover:text-app-ink border-transparent',
                ].join(' ')}
              >
                <Icon />{label}
              </Link>
            )
          })}
        </nav>

        {/* User controls */}
        <div className="px-4 py-4 border-t border-app-edge flex-shrink-0 space-y-3">
          <SpotifyConnect />
          <UsernameEdit />
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleLogout}
              className="text-xs text-app-muted hover:text-app-ink transition-colors"
            >
              Sign out
            </button>
            <button
              onClick={toggle}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-app-muted hover:bg-app-input hover:text-app-ink transition-colors"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Content ──────────────────────────────────────────────── */}
      <main className="flex-1 sm:ml-52 pb-20 sm:pb-0 min-h-screen">
        {children}
      </main>

      {/* ── Bottom nav (mobile only) ──────────────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 h-16 flex bg-app-bg border-t">
        {NAV.map(({ path, label, Icon }) => {
          const active = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`flex-1 flex flex-col items-center justify-center gap-1`}
            >
              <Icon />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
