import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, LogOut, Moon, Sun, Eye, EyeOff, Check, Sparkles } from "lucide-react";
import api from "../services/api";
import { useAuthStore } from "../stores/authStore";
import UsernameEdit from "../components/UsernameEdit";
import { useTheme } from "../hooks/useTheme";

// ─── Password strength ────────────────────────────────────────────────────────

const CRITERIA = [
  { key: "length",   label: "6+ Zeichen",         test: (p: string) => p.length >= 6 },
  { key: "upper",    label: "Großbuchstabe",       test: (p: string) => /[A-Z]/.test(p) },
  { key: "lower",    label: "Kleinbuchstabe",      test: (p: string) => /[a-z]/.test(p) },
  { key: "digit",    label: "Zahl",                test: (p: string) => /\d/.test(p) },
  { key: "special",  label: "Sonderzeichen ✦",     test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  { key: "long",     label: "12+ Zeichen",         test: (p: string) => p.length >= 12 },
]

const STRENGTH_LABELS = ["", "Sehr schwach", "Schwach", "Okay", "Gut", "Stark", "Sehr stark"]
const STRENGTH_COLORS = ["#3f3f46", "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#22c55e"]

function ChangePassword() {
  const [current,  setCurrent]  = useState("")
  const [next,     setNext]     = useState("")
  const [confirm,  setConfirm]  = useState("")
  const [showCur,  setShowCur]  = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [done,     setDone]     = useState(false)
  const [serverErr, setServerErr] = useState("")

  const met       = CRITERIA.map((c) => c.test(next))
  const score     = met.filter(Boolean).length
  const canSubmit = met[0] && next === confirm && current.length > 0
  const mismatch  = confirm.length > 0 && next !== confirm

  const change = useMutation({
    mutationFn: () =>
      api.patch("/auth/password", { currentPassword: current, newPassword: next }),
    onSuccess: () => {
      setDone(true)
      setCurrent(""); setNext(""); setConfirm("")
      setServerErr("")
      setTimeout(() => setDone(false), 3500)
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setServerErr(err.response?.data?.message ?? "Fehler beim Ändern des Passworts")
    },
  })

  return (
    <div className="rounded-xl bg-surface-raised border border-edge overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-edge flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground-subtle uppercase tracking-widest">
          Passwort ändern
        </p>
        {done && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-accent">
            <Check size={11} strokeWidth={2.5} />
            Gespeichert!
          </span>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Current password */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-foreground-subtle">Aktuelles Passwort</label>
          <div className="relative">
            <input
              type={showCur ? "text" : "password"}
              value={current}
              onChange={(e) => { setCurrent(e.target.value); setServerErr("") }}
              placeholder="••••••••"
              className="w-full bg-surface border border-edge rounded-lg px-3 py-2 pr-9 text-sm
                         focus:outline-none focus:border-foreground-muted/50 transition-colors
                         placeholder:text-foreground-subtle"
            />
            <button
              type="button"
              onClick={() => setShowCur((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground-muted transition-colors"
            >
              {showCur ? <EyeOff size={13} strokeWidth={1.75} /> : <Eye size={13} strokeWidth={1.75} />}
            </button>
          </div>
          {serverErr && (
            <p className="text-[11px] text-red-400">{serverErr}</p>
          )}
        </div>

        {/* New password */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-foreground-subtle">Neues Passwort</label>
          <div className="relative">
            <input
              type={showNext ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface border border-edge rounded-lg px-3 py-2 pr-9 text-sm
                         focus:outline-none focus:border-foreground-muted/50 transition-colors
                         placeholder:text-foreground-subtle"
            />
            <button
              type="button"
              onClick={() => setShowNext((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground-muted transition-colors"
            >
              {showNext ? <EyeOff size={13} strokeWidth={1.75} /> : <Eye size={13} strokeWidth={1.75} />}
            </button>
          </div>

          {/* Strength bar */}
          {next.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {CRITERIA.map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{
                      background: i < score ? STRENGTH_COLORS[score] : "var(--color-surface-overlay)",
                    }}
                  />
                ))}
              </div>
              <p className="text-[10px] font-medium transition-colors" style={{ color: STRENGTH_COLORS[score] }}>
                {STRENGTH_LABELS[score]}
              </p>
            </div>
          )}

          {/* Criteria chips */}
          {next.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {CRITERIA.map((c, i) => (
                <span
                  key={c.key}
                  className={[
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-200 border",
                    met[i]
                      ? "bg-accent/10 border-accent/30 text-accent"
                      : "bg-transparent border-edge text-foreground-subtle opacity-50",
                  ].join(" ")}
                >
                  {met[i] && <Check size={8} strokeWidth={3} />}
                  {c.key === "special" && !met[i] && <Sparkles size={8} strokeWidth={1.75} />}
                  {c.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-foreground-subtle">Passwort bestätigen</label>
          <div className="relative">
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className={[
                "w-full bg-surface border rounded-lg px-3 py-2 pr-9 text-sm",
                "focus:outline-none transition-colors placeholder:text-foreground-subtle",
                confirm.length === 0
                  ? "border-edge"
                  : mismatch
                    ? "border-red-500/50 focus:border-red-500/70"
                    : "border-accent/40 focus:border-accent/60",
              ].join(" ")}
            />
            {confirm.length > 0 && !mismatch && (
              <Check
                size={13}
                strokeWidth={2.5}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-accent"
              />
            )}
          </div>
          {mismatch && (
            <p className="text-[11px] text-red-400">Passwörter stimmen nicht überein</p>
          )}
        </div>

        {/* Hint */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-surface border border-edge">
          <Sparkles size={12} className="text-foreground-subtle flex-shrink-0 mt-0.5" strokeWidth={1.75} />
          <p className="text-[11px] text-foreground-subtle leading-relaxed">
            Sonderzeichen wie <span className="font-mono text-foreground-muted">!@#$%^&*</span> machen dein Passwort deutlich sicherer.
          </p>
        </div>

        <button
          onClick={() => change.mutate()}
          disabled={!canSubmit || change.isPending}
          className="w-full py-2 rounded-lg bg-accent text-black text-sm font-semibold
                     hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {change.isPending ? "Wird geändert…" : "Passwort ändern"}
        </button>
      </div>
    </div>
  )
}

interface SpotifyStatus {
  connected: boolean;
  spotifyId: string | null;
}

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { isDark, toggle } = useTheme();

  function handleLogout() {
    clearAuth();
    navigate("/login");
  }

  const { data: status, isLoading } = useQuery<SpotifyStatus>({
    queryKey: ["spotify-status"],
    queryFn: () =>
      api.get<SpotifyStatus>("/spotify/status").then((r) => r.data),
  });

  const disconnect = useMutation({
    mutationFn: () => api.delete("/spotify/disconnect"),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["spotify-status"] }),
  });

  useEffect(() => {
    const result = searchParams.get("spotify");
    if (!result) return;
    if (result === "connected") {
      queryClient.invalidateQueries({ queryKey: ["spotify-status"] });
    }
    setSearchParams((prev) => {
      prev.delete("spotify");
      return prev;
    });
  }, [searchParams, queryClient, setSearchParams]);

  async function handleConnect() {
    const { data } = await api.get<{ url: string }>("/spotify/connect");
    window.location.href = data.url;
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-8 overflow-hidden">
      <div>
        <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-widest mb-1">
          Account
        </p>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
      </div>

      {/* Account section */}
      <section className="space-y-3">
        <p className="text-xs font-semibold text-foreground-subtle uppercase tracking-widest">
          Profile
        </p>
        <div className="rounded-xl bg-surface-raised border border-edge divide-y divide-edge">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs text-foreground-subtle mb-0.5">Email</p>
              <p className="text-sm text-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-foreground-subtle mb-1.5">
              Display name
            </p>
            <UsernameEdit />
          </div>
        </div>
      </section>

      {/* Password section */}
      <section className="space-y-3">
        <ChangePassword />
      </section>

      {/* Spotify section */}
      <section className="space-y-3">
        <p className="text-xs font-semibold text-foreground-subtle uppercase tracking-widest">
          Spotify
        </p>

        <div className="rounded-xl bg-surface-raised border border-edge overflow-hidden">
          {isLoading ? (
            <div className="px-4 py-4 space-y-2">
              <div className="h-3 w-20 rounded-full bg-surface-overlay animate-pulse" />
              <div className="h-3 w-40 rounded-full bg-surface-overlay animate-pulse" />
            </div>
          ) : status?.connected ? (
            <div className="px-4 py-4 flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                  <p className="text-sm font-medium text-foreground">
                    Connected
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-foreground-muted truncate">
                    Spotify ID: {status.spotifyId}
                  </p>
                  {status.spotifyId && (
                    <a
                      href={`https://open.spotify.com/user/${status.spotifyId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground-subtle hover:text-accent transition-colors flex-shrink-0"
                      aria-label="Open Spotify profile"
                    >
                      <ExternalLink size={11} strokeWidth={1.75} />
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
                className="text-xs text-foreground-subtle hover:text-foreground-muted disabled:opacity-40
                           transition-colors flex-shrink-0 pt-0.5"
              >
                {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
              </button>
            </div>
          ) : (
            <div className="px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-foreground mb-0.5">Not connected</p>
                <p className="text-xs text-foreground-subtle">
                  Verbinde dich um deine aktive Wiedergabe zu suchen.
                </p>
              </div>
              <button
                onClick={handleConnect}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-lg bg-accent text-black text-xs font-semibold
                           hover:opacity-90 transition-opacity"
              >
                Verbinden
              </button>
            </div>
          )}
        </div>
      </section>
      <section className="pt-6 border-t border-edge">
        <div className="flex items-center justify-between pt-0.5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors"
          >
            <LogOut size={12} strokeWidth={1.75} />
            Sign out
          </button>
          <button
            onClick={toggle}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-muted hover:bg-surface-overlay hover:text-foreground transition-colors"
          >
            {isDark ? (
              <Sun size={14} strokeWidth={1.75} />
            ) : (
              <Moon size={14} strokeWidth={1.75} />
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
