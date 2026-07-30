# Frontend — Claude Code Guide

See also: [Root CLAUDE.md](../CLAUDE.md) | [Backend CLAUDE.md](../backend/CLAUDE.md)

## Key files — quick orientation
| Purpose | File |
|---|---|
| Router (all routes) | [src/App.tsx](src/App.tsx) |
| React entry + QueryClient | [src/main.tsx](src/main.tsx) |
| All shared TS types | [src/types/index.ts](src/types/index.ts) |
| Axios instance | [src/services/api.ts](src/services/api.ts) |
| Nav + FAB + layout | [src/components/AppLayout.tsx](src/components/AppLayout.tsx) |
| Global styles + keyframes | [src/index.css](src/index.css) |
| Auth store | [src/stores/authStore.ts](src/stores/authStore.ts) |
| Visual/background store | [src/stores/visualStore.ts](src/stores/visualStore.ts) |

## Adding a new page
1. Create `src/pages/NewPage.tsx`
2. Add route in [src/App.tsx](src/App.tsx) inside `createBrowserRouter`, wrapped in `<AppPage>`
3. Add nav link in [src/components/AppLayout.tsx](src/components/AppLayout.tsx)
4. Add types to [src/types/index.ts](src/types/index.ts)

## API calls — always use the api service
```typescript
import api from '../services/api'

const { data } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => api.get<ResponseType>(`/resource/${id}`).then(r => r.data),
})
```

## React Query key registry
Keep this updated when adding new queries. These are the canonical keys — invalidate exactly these when mutating.

| Key | Data | File |
|---|---|---|
| `['saved-lyrics']` | User's bookmarks (slim list shape) | [src/pages/Favorites.tsx](src/pages/Favorites.tsx) |
| `['saved-lyrics-favorites']` | Favourites only | [src/pages/Favorites.tsx](src/pages/Favorites.tsx) |
| `['saved-lyrics-by-spotify', id]` | Ensure-and-fetch one bookmark | [src/pages/SongDetail.tsx](src/pages/SongDetail.tsx) |
| `['songs']` | Shared song library (slim) | [src/pages/Discover.tsx](src/pages/Discover.tsx) |
| `['lyrics', spotifyId]` | Structured lyrics for a song | [src/components/LyricsEditor.tsx](src/components/LyricsEditor.tsx) |
| `['annotations', spotifyId]` | Per-line annotations | [src/components/LyricsEditor.tsx](src/components/LyricsEditor.tsx) |
| `['song-notes', spotifyId]` | Per-user notes on a song | [src/pages/SongDetail.tsx](src/pages/SongDetail.tsx) |
| `['lrclib-preview', spotifyId]` | LRCLib candidate lyrics | [src/components/LyricsEditor.tsx](src/components/LyricsEditor.tsx) |
| `['collections']` | User's collections | [src/pages/Collections.tsx](src/pages/Collections.tsx) |
| `['collections-public']` | Public collections | [src/pages/Collections.tsx](src/pages/Collections.tsx) |
| `['collection', id]` | Single collection detail | [src/pages/CollectionDetail.tsx](src/pages/CollectionDetail.tsx) |
| `['insights', spotifyId]` | Community insights for a song | [src/pages/SongDetail.tsx](src/pages/SongDetail.tsx) |
| `['spotify-current-track']` | Currently playing track | [src/hooks/useNowPlaying.ts](src/hooks/useNowPlaying.ts) |
| `['spotify-status']` | Spotify connection state | [src/components/SpotifyConnect.tsx](src/components/SpotifyConnect.tsx) |
| `['spotify-liked', offset]` | Liked songs page | [src/pages/SpotifyLibrary.tsx](src/pages/SpotifyLibrary.tsx) |
| `['spotify-playlists', offset]` | Playlists page | [src/pages/SpotifyLibrary.tsx](src/pages/SpotifyLibrary.tsx) |
| `['spotify-playlist-tracks', id, offset]` | Tracks inside a playlist | [src/pages/SpotifyLibrary.tsx](src/pages/SpotifyLibrary.tsx) |
| `['audio-features', spotifyId]` | BPM/energy/valence (`staleTime: Infinity`) | [src/hooks/useAudioFeatures.ts](src/hooks/useAudioFeatures.ts) |
| `['analytics-*']`, `['analytics-global-*']` | Personal + community analytics | [src/pages/Analytics.tsx](src/pages/Analytics.tsx) |
| `['timeline-monthly', year]` | Monthly songs (Erinnerungen) | [src/pages/Timeline.tsx](src/pages/Timeline.tsx) |
| `['digest-latest']` | Latest unread weekly digest | [src/components/DigestBanner.tsx](src/components/DigestBanner.tsx) |
| `['feature-requests', mode]` | Bugs or feature wishes | [src/components/FeatureRequestPanel.tsx](src/components/FeatureRequestPanel.tsx) |
| `['play-history']` | Recently heard tracks | [src/components/RecentlyHeard.tsx](src/components/RecentlyHeard.tsx) |
| `['global-feed']` | Cross-user search activity | [src/pages/Discover.tsx](src/pages/Discover.tsx) |
| `['search-history']` | Own Spotify search history | [src/components/LyricsSearch.tsx](src/components/LyricsSearch.tsx) |
| `['yt-oembed', videoId]` | YouTube title (`staleTime: Infinity`) | [src/pages/SongDetail.tsx](src/pages/SongDetail.tsx) |
| `['auth-me']` | Current user, re-synced from server (`staleTime: 30s`) | [src/components/PrivateRoute.tsx](src/components/PrivateRoute.tsx) |
| `['admin-users']` | User list for the admin page | [src/pages/Admin.tsx](src/pages/Admin.tsx) |

**QueryClient defaults** ([src/main.tsx](src/main.tsx)):
- `networkMode: 'always'` — the default `'online'` *pauses* a query whose request can't reach the server. Status stays `pending`, `isError` never flips, and `refetch()` waits for a connectivity event that never comes because the browser was never offline, only the backend was.
- `retry: 1` — three retries with backoff meant ~7s before a failure was visible.

**Failed queries:** check with `queryHasNoData(status, fetchStatus)` from [src/lib/queryState.ts](src/lib/queryState.ts), not `isError` alone, and render [QueryError](src/components/QueryError.tsx) — its retry does `resetQueries`, because a paused query ignores `refetch`.

**staleTime conventions:**
- Audio features, YouTube metadata: `Infinity`
- Analytics, timeline: 5 min
- Spotify library pages: 2 min
- Everything else: default (0)

## Zustand stores

### [`authStore`](src/stores/authStore.ts)
JWT token + user identity, persisted to localStorage under `auth`. `{ token, user, isAuthenticated, setAuth, updateUser, clearAuth }`
- The persisted `user` goes stale when an admin changes a role or resets a password — [PrivateRoute](src/components/PrivateRoute.tsx) re-syncs it from `/auth/me` on every mount
- `user.mustChangePassword` → PrivateRoute redirects to `/set-password`; the backend independently 403s every other route
- **Any response carrying a new `access_token` must go through `setAuth`** (password change, onboarding) — the old token is dead server-side

### [`visualStore`](src/stores/visualStore.ts)
Dynamic background + visualizer settings — persisted to localStorage as `visual-settings`.
`{ enabled, pages, mode, blurAmount, dimAmount, showVisualizer, visualizerStyle, setEnabled, setPageEnabled, set }`
- `pages` keys: `dashboard`, `discover`, `favorites`, `timeline`, `settings`, `song`
- `mode`: `'blur' | 'ambient' | 'both'`
- `visualizerStyle`: `'pulse' | 'breathe'`
- **Adding a `pages` key needs the custom `merge`** that is already there: Zustand shallow-merges, so an older persisted `pages` object would replace the defaults and the new key would read as `undefined`. Do **not** bump `version` to fix that — without a `migrate` function Zustand discards mismatched state and resets everyone's settings.

## Mobile/desktop split
- Breakpoint: `sm:` = 640px (Tailwind)
- **Module-level const** (evaluated once at import, not per render — intentional):
  ```typescript
  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
  ```
- Use `hidden sm:block` / `sm:hidden` for CSS-only conditional rendering
- Desktop-only components: [DynamicBackground](src/components/DynamicBackground.tsx), `NowPlayingWidget` visualizer, [RecentlyHeard](src/components/RecentlyHeard.tsx)

## Component guide

### [AppLayout.tsx](src/components/AppLayout.tsx)
Wraps all authenticated pages. Owns the nav, the FAB, the scroll reset on navigation, and the shared now-playing poll.
- Nav is split: `PRIMARY_NAV` (4 items) fills the mobile bar, `SECONDARY_NAV` (+ the admin entry) sits behind a "Mehr" `BottomSheet`. The desktop sidebar renders both flat. Eight items across a 375px bar left 47px each.
- FAB state: `pickerOpen: boolean` + `panelMode: PanelMode | null`. Its `bottom-*` offset shifts when the now-playing bar is up, or it covers the bar's fullscreen button.

### Now playing
- [useNowPlaying](src/hooks/useNowPlaying.ts) owns `['spotify-current-track']`. React Query dedupes in-flight *requests* but **not** `refetchInterval` timers — every observer schedules its own. AppLayout polls at 5s; everything that only displays the track passes `poll: false` and reads the shared cache. Only karaoke and timestamp sync turn on their own faster timer.
- [NowPlayingBar](src/components/NowPlayingBar.tsx) is the mobile surface, rendered inside the bottom nav so it stacks without magic offsets. [NowPlayingWidget](src/components/NowPlayingWidget.tsx) is the desktop sidebar equivalent. Both link straight to `/songs/:spotifyId`.
- Opening a song never needs an existence check first: `GET /saved-lyrics/by-spotify/:spotifyId` creates the `Song` from the play history when it is missing.

### [DynamicBackground.tsx](src/components/DynamicBackground.tsx)
- Props: `{ pageKey: string | null }` — must match a key in `visualStore.pages`
- Reads `['spotify-current-track']` from the RQ cache — **zero extra network requests**
- Returns `null` immediately if mobile or page disabled in settings
- Mounted once in `AppLayout`, not per page

### [FeatureRequestPanel.tsx](src/components/FeatureRequestPanel.tsx)
- Props: `{ mode: 'feature' | 'bug'; onClose: () => void }`
- `mode='bug'` → orange accent; `mode='feature'` → neutral accent
- API: `GET/POST /feature-requests?kind={mode}`

### [SongCard.tsx](src/components/SongCard.tsx)
- The one row component for song lists. Pass `spotifyId` and it navigates to the song page by itself.

### [BottomSheet.tsx](src/components/BottomSheet.tsx)
- The height cap lives on the inner scroll container, not the sheet — on the sheet it clipped anything past 80vh out of reach.
- Drag-to-dismiss is bound to the handle only, so scrolling the content cannot close it.
- Bottom padding is `calc(1.25rem + env(safe-area-inset-bottom))`; the `.pb-safe` utility sits after Tailwind's `p-5` in the same layer and would win, replacing the padding with 0 on Android.

### [LyricsEditor.tsx](src/components/LyricsEditor.tsx)
- Handles fetchStatus polling (FETCHING → polls `/lyrics/:id` every 5s)
- Karaoke mode: `useNowPlaying({ intervalMs: 1000, poll: … })`, highlights active line by `timestampMs`
- Seek: Timer icon → `POST /spotify/seek?positionMs=`

## Copy and formatting
- The UI is German (`index.html` has `lang="de"`). No i18n library.
- Dates and durations go through [src/lib/format.ts](src/lib/format.ts) — `timeAgo`, `timeAgoShort`, `formatAdded`, `formatDate`, `formatMs`, `displayArtists`. These used to be private copies in six components, `timeAgo` in two different languages, both visible on the Dashboard at once.

## Mobile gotchas
- **`hover:` does not exist on touch.** Anything revealed with `opacity-0 group-hover:opacity-100` must be guarded as `sm:opacity-0 sm:group-hover:opacity-100`, otherwise the action is simply unreachable on the primary device. `rg "(?<!sm:)opacity-0 group-hover" src` must stay empty.
- Toolbars inside `overflow-hidden` containers need `flex-wrap`, or trailing controls get clipped away.
- Light mode: use `text-red-600 dark:text-red-400`; plain `text-red-400` sits at ~2.9:1 on white.

## Types — always in [src/types/index.ts](src/types/index.ts)
- `SpotifyCurrentlyPlayingResponse` — shared between the now-playing components
- `SavedLyric` — has `artists: string[]`, `visibility: Visibility`, `fetchStatus: LyricsFetchStatus`
- `LyricsVersion` — carries no `rawText`; restoring goes by version number
- `FeatureRequest` — has `kind: string` (`'feature' | 'bug'`)
- `Song` — shared canonical entity with `audioFeatures`
- **Display artists**: `displayArtists(artists, artist)` from `lib/format`

## CSS keyframes ([src/index.css](src/index.css))
- `bg-pulse` — scale pulse timed to BPM (used by DynamicBackground visualizer)
- `bg-breathe` — slow blur pulse at 2× BPM duration

## Tailwind design tokens
- `bg-surface` — page background
- `text-foreground` — primary text
- `text-foreground-muted` — secondary text
- `border-edge` — border color
- `bg-accent` / `text-accent` — primary accent color
