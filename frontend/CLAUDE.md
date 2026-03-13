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
| `['saved-lyrics']` | User's saved songs | [src/pages/Songs.tsx](src/pages/Songs.tsx) |
| `['lyrics', savedLyricId]` | Structured lyrics for a song | [src/components/LyricsEditor.tsx](src/components/LyricsEditor.tsx) |
| `['line-annotations', lyricsId]` | Per-line annotations | [src/components/LyricsEditor.tsx](src/components/LyricsEditor.tsx) |
| `['collections']` | User's collections | [src/pages/Collections.tsx](src/pages/Collections.tsx) |
| `['collections-public']` | Public collections (Discover tab) | [src/pages/Collections.tsx](src/pages/Collections.tsx) |
| `['collection', id]` | Single collection detail | [src/pages/CollectionDetail.tsx](src/pages/CollectionDetail.tsx) |
| `['insights', spotifyId]` | Community insights for a song | [src/pages/SongDetail.tsx](src/pages/SongDetail.tsx) |
| `['spotify-current-track']` | Currently playing track | [src/components/NowPlayingWidget.tsx](src/components/NowPlayingWidget.tsx) |
| `['audio-features', spotifyId]` | BPM/energy/valence (`staleTime: Infinity`) | [src/hooks/useAudioFeatures.ts](src/hooks/useAudioFeatures.ts) |
| `['analytics-words']` | Top words | [src/pages/Analytics.tsx](src/pages/Analytics.tsx) |
| `['analytics-emotions']` | Mood tag distribution | [src/pages/Analytics.tsx](src/pages/Analytics.tsx) |
| `['analytics-artists']` | Top artists | [src/pages/Analytics.tsx](src/pages/Analytics.tsx) |
| `['analytics-themes']` | Context tag distribution | [src/pages/Analytics.tsx](src/pages/Analytics.tsx) |
| `['analytics-timeline']` | 52-week contribution grid | [src/pages/Analytics.tsx](src/pages/Analytics.tsx) |
| `['timeline-monthly', year]` | Monthly songs (Memory Timeline) | [src/pages/Timeline.tsx](src/pages/Timeline.tsx) |
| `['digest-latest']` | Latest unread weekly digest | [src/components/DigestBanner.tsx](src/components/DigestBanner.tsx) |
| `['feature-requests', mode]` | Bugs or feature wishes | [src/components/FeatureRequestPanel.tsx](src/components/FeatureRequestPanel.tsx) |
| `['play-history']` | Recently heard tracks | [src/components/RecentlyHeard.tsx](src/components/RecentlyHeard.tsx) |

**staleTime conventions:**
- Audio features, analytics: `Infinity` or 5 min (rarely changes)
- Spotify current track: polled on a `setInterval` — React Query `staleTime` not relevant here
- Everything else: default (0)

## Zustand stores

### [`authStore`](src/stores/authStore.ts)
JWT token + user identity. `{ token, user, setToken, logout }`

### [`visualStore`](src/stores/visualStore.ts)
Dynamic background + visualizer settings — persisted to localStorage as `visual-settings`.
`{ enabled, pages, mode, blurAmount, dimAmount, showVisualizer, visualizerStyle, setEnabled, setPageEnabled, set }`
- `pages` keys: `dashboard`, `discover`, `favorites`, `timeline`
- `mode`: `'blur' | 'ambient' | 'both'`
- `visualizerStyle`: `'pulse' | 'breathe'`

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
Wraps all authenticated pages. Contains bottom nav, FAB (bug/feature picker), `NowPlayingWidget`.
- FAB state: `pickerOpen: boolean` + `panelMode: PanelMode | null`

### [DynamicBackground.tsx](src/components/DynamicBackground.tsx)
- Props: `{ page: string }` — must match a key in `visualStore.pages`
- Reads `['spotify-current-track']` from RQ cache (`useQueryClient().getQueryData()`) — **zero extra network requests**
- Returns `null` immediately if mobile or page disabled in settings
- **Must be first child** in the page component's return

### [FeatureRequestPanel.tsx](src/components/FeatureRequestPanel.tsx)
- Props: `{ mode: 'feature' | 'bug'; onClose: () => void }`
- `mode='bug'` → orange accent; `mode='feature'` → neutral accent
- API: `GET/POST /feature-requests?kind={mode}`

### [TrackListItem.tsx](src/components/TrackListItem.tsx)
- Props: `{ size?: 'sm' | 'md' }` — `sm` for Timeline compact cards, `md` (default) everywhere else

### [LyricsEditor.tsx](src/components/LyricsEditor.tsx)
- Handles fetchStatus polling (FETCHING → polls `/lyrics/:id` every 5s)
- Karaoke mode: polls `['spotify-current-track']` every 1s, highlights active line by `timestampMs`
- Seek: Timer icon → `POST /spotify/seek?positionMs=`

## Types — always in [src/types/index.ts](src/types/index.ts)
- `SpotifyCurrentlyPlayingResponse` — shared between NowPlayingWidget, LyricsEditor, DynamicBackground
- `SavedLyric` — has `artists: string[]`, `visibility: Visibility`, `fetchStatus: LyricsFetchStatus`
- `FeatureRequest` — has `kind: string` (`'feature' | 'bug'`)
- `Song` — shared canonical entity with `audioFeatures`
- **Display artists**: always `artists?.join(", ") || artist`

## CSS keyframes ([src/index.css](src/index.css))
- `bg-pulse` — scale pulse timed to BPM (used by DynamicBackground visualizer)
- `bg-breathe` — slow blur pulse at 2× BPM duration

## CSS custom properties set by DynamicBackground
These are hooks for a future animation editor:
- `--bg-blur` — blur radius (px)
- `--bg-dim` — dim strength (0–1)
- `--bg-pulse-scale` — max scale during pulse
- `--bg-pulse-duration` — one-beat duration (ms)
- `--bg-ambient-opacity` — ambient color strength (0–1)

## Tailwind design tokens
- `bg-surface` — page background
- `text-foreground` — primary text
- `text-foreground-muted` — secondary text
- `border-edge` — border color
- `bg-accent` / `text-accent` — primary accent color
