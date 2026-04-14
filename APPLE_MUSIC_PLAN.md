# Apple Music Integration Plan

> Created: April 2026
> Status: Planning — not started
> Depends on: `feat/saved-songs-rework` branch (shared `Song` model with `appleMusicId`)

---

## Goal

Add Apple Music as a second music provider alongside Spotify. Users who use Apple Music instead of (or in addition to) Spotify can:
- Browse and import their Apple Music library and playlists
- Save/bookmark songs manually
- Use karaoke mode with seek **when playing through the web app**

Spotify and Apple Music are **additive** — a user can have both connected.

> **Critical limitation: no cross-device now-playing.**
> Spotify's `/me/player/currently-playing` is a server-side API that sees all your devices (iPhone, Mac app, desktop app). Apple Music has no equivalent. MusicKit JS only knows about playback it directly controls in the browser tab. If the user is listening on their iPhone or the Mac Music app, the NowPlayingWidget will not show it.
>
> **Consequence:** The NowPlayingWidget and karaoke mode only work for Apple Music if the user plays through the web app itself. For most Apple Music users this means those features are largely unavailable. Library import and manual song-saving are unaffected.

---

## Architecture decisions

### Playback (NowPlayingWidget, karaoke, seek)

Apple Music is **browser-only** via MusicKit JS. There is no server-side "currently playing" API.
MusicKit fires events instead of requiring polling:
- `nowPlayingItemDidChange` → track changed
- `playbackProgressDidChange` → position update
- `playbackStateDidChange` → play/pause

This is better than the Spotify 5s poll. The abstraction hook (`useMusicPlayer`) uses:
- **Apple Music**: MusicKit JS event listeners (client-side only)
- **Spotify**: existing `/spotify/current-track` poll + `/spotify/seek`

### Library / import

Library browsing _does_ go through the backend — the Developer Token must not be exposed to the client, and the Music User Token is stored server-side for API calls.

### Song identity

`Song.spotifyId` is the current unique key. Apple Music songs get `Song.appleMusicId` (nullable).
Songs saved from Apple Music have `spotifyId = null`. The `Song` upsert branches on which ID is available.

---

## What the user must do first

| # | Task | Notes |
|---|---|---|
| 1 | Apple Developer account | $99/year at developer.apple.com |
| 2 | Create a MusicKit ID | Dev portal → Identifiers → add MusicKit ID (e.g. `music.com.yourapp.helper`) |
| 3 | Create a MusicKit private key | Dev portal → Keys → enable MusicKit for Media Services → download `.p8` once |
| 4 | Note **Key ID** and **Team ID** | Team ID is in the top-right of the dev portal |
| 5 | Add env vars to `backend/.env` | See below |
| 6 | Update `backend/.env.example` | Add keys without values |

Required env vars:
```
APPLE_TEAM_ID=AB12CD34EF
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

Note: Users need an **active Apple Music subscription** to access library endpoints.

---

## Implementation checklist

### Phase 1 — Schema + Backend

- [ ] Add `appleMusicId String?` to `Song` model with `@unique` constraint
- [ ] Add `AppleMusicToken` model (`id`, `userId @unique`, `musicUserToken String`, `createdAt`)
- [ ] Add `User.appleMusicToken AppleMusicToken?` relation
- [ ] Run `prisma migrate dev --name add_apple_music` + `prisma generate`
- [ ] Create `backend/src/apple-music/` module with:
  - `apple-music.module.ts`
  - `apple-music.service.ts`
  - `apple-music.controller.ts`
- [ ] `AppleMusicService.getDeveloperToken()` — signs ES256 JWT with private key (Team ID + Key ID header, `iss`=Team ID, `iat`/`exp` max 6 months). Uses Node `crypto.createSign` with the `.p8` key.
- [ ] `GET /apple-music/developer-token` — public endpoint (no `JwtAuthGuard`), returns signed Developer Token so MusicKit JS can configure itself in the browser
- [ ] `POST /apple-music/connect` (body: `{ musicUserToken: string }`) — stores Music User Token; upserts `AppleMusicToken`
- [ ] `GET /apple-music/status` — returns `{ connected: boolean }`
- [ ] `DELETE /apple-music/disconnect` — deletes `AppleMusicToken` record
- [ ] `GET /apple-music/library/songs?offset=0&limit=25` — proxies `GET https://api.music.apple.com/v1/me/library/songs` with Developer Token + Music User Token headers
- [ ] `GET /apple-music/library/playlists` — proxies `/v1/me/library/playlists`
- [ ] `GET /apple-music/library/playlists/:id/tracks` — proxies `/v1/me/library/playlists/:id/tracks`
- [ ] `POST /apple-music/library/import` (body: `{ tracks: AppleMusicTrackDto[] }`) — same bulk-import pattern as `/spotify/library/import`; upserts `Song` by `appleMusicId`, creates `SavedLyric`
- [ ] `GET /apple-music/recently-played` — proxies `/v1/me/recent/played/tracks`
- [ ] Register `AppleMusicModule` in `app.module.ts`

### Phase 2 — Frontend abstraction

- [ ] Add MusicKit JS to `frontend/index.html`:
  ```html
  <script src="https://js-cdn.music.apple.com/musickit/v3/musickit.js"></script>
  ```
- [ ] Add `CurrentTrack` type to `frontend/src/types/index.ts`:
  ```typescript
  export type MusicProvider = 'spotify' | 'apple'
  export interface CurrentTrack {
    id: string
    name: string
    artists: string[]
    imgUrl: string | null
    durationMs: number
    provider: MusicProvider
  }
  ```
- [ ] Create `frontend/src/hooks/useMusicPlayer.ts` — unified interface:
  - Spotify: polls `['spotify-current-track']` RQ query, calls `/spotify/seek`
  - Apple: subscribes to MusicKit JS events; `MusicKit.getInstance().seekToTime(s)`
  - Returns `{ track: CurrentTrack | null, progressMs: number, isPlaying: boolean, seek(ms): void, provider: MusicProvider | null }`
- [ ] Create `frontend/src/components/AppleMusicConnect.tsx` — mirrors `SpotifyConnect.tsx`:
  1. Fetches `GET /apple-music/developer-token`
  2. Calls `MusicKit.configure({ developerToken, app: { name, build } })`
  3. Calls `await MusicKit.getInstance().authorize()` → gets Music User Token
  4. Posts to `POST /apple-music/connect`
- [ ] Update `NowPlayingWidget.tsx` — replace direct Spotify query with `useMusicPlayer()`
- [ ] Update `LyricsEditor.tsx` karaoke mode — replace Spotify poll + seek with `useMusicPlayer()`
- [ ] Update `DynamicBackground.tsx` — reads from `useMusicPlayer()` instead of RQ cache directly
- [ ] Create `frontend/src/pages/AppleLibrary.tsx` — mirrors `SpotifyLibrary.tsx`
- [ ] Update `frontend/src/pages/Settings.tsx` — add Apple Music section (connect/disconnect, status)
- [ ] Add `/apple-library` route in `App.tsx`

### Phase 3 — Polish

- [ ] `useAudioFeatures` hook: return `null` gracefully when `song.spotifyId` is null (Apple-only songs have no audio features equivalent)
- [ ] `LyricsViewer` / song-save flow: accept `appleMusicId` instead of `spotifyId` when provider is Apple Music
- [ ] Show provider badge (Spotify green / Apple pink) on `NowPlayingWidget` and `TrackListItem`
- [ ] Play history: record Apple Music plays using same `PlayHistory` model (use `appleMusicId` in the `spotifyId` column, or add `appleMusicId` column — TBD)

---

## Key API differences from Spotify

| Feature | Spotify | Apple Music |
|---|---|---|
| Auth flow | Server-side OAuth redirect | Browser-side `MusicKit.authorize()` |
| Token type | Access + refresh token (server) | Developer Token (signed JWT, server) + Music User Token (browser → stored server) |
| Now playing | `GET /v1/me/player/currently-playing` — **all devices** (poll) | `MusicKit.nowPlayingItem` — **browser tab only**, no cross-device API |
| Seek | `PUT /v1/me/player/seek?position_ms=` (server) | `MusicKit.seekToTime(seconds)` (client, browser-controlled playback only) |
| Audio features | `GET /v1/audio-features/:id` | No equivalent |
| Library | Paginated REST API | Same pattern, different field names |
| Track ID | `spotifyId` (string) | `appleMusicId` (string, catalog or library ID) |

---

## MusicKit JS data mapping

```
MusicKit nowPlayingItem → CurrentTrack
  .id                   → id
  .title                → name
  .artistName           → artists[0] (single string, not array)
  .artwork.url(300,300) → imgUrl
  .durationInMillis     → durationMs

MusicKit instance
  .currentPlaybackTime * 1000  → progressMs
  .isPlaying (via playbackState) → isPlaying
```

Note: `artistName` is a single string from MusicKit, not an array like Spotify. Treat as `artists = [artistName]` for the shared `CurrentTrack` type.
