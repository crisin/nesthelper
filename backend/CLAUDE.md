# Backend — Claude Code Guide

See also: [Root CLAUDE.md](../CLAUDE.md) | [Frontend CLAUDE.md](../frontend/CLAUDE.md)

## Adding a new module (standard pattern)

Files to create:
- [`src/<name>/<name>.service.ts`](src/) — business logic, inject `PrismaService`
- [`src/<name>/<name>.controller.ts`](src/) — HTTP layer, always `@UseGuards(JwtAuthGuard)`
- [`src/<name>/<name>.module.ts`](src/) — imports `AuthModule` + `PrismaModule`
- Register in [`src/app.module.ts`](src/app.module.ts)

```typescript
// Controller boilerplate
import { Controller, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type AuthedRequest = { user: { id: string } };

@Controller('your-resource')
@UseGuards(JwtAuthGuard)
export class YourController {
  constructor(private readonly service: YourService) {}
}
```

```typescript
// Module boilerplate
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [YourController],
  providers: [YourService],
})
export class YourModule {}
```

## Prisma patterns

### JSON field read/write (e.g. `Song.audioFeatures` in [schema.prisma](prisma/schema.prisma))
```typescript
// Read — cast through unknown (Prisma returns JsonValue)
const features = song.audioFeatures as unknown as AudioFeatures;

// Write — cast to object
await prisma.song.update({ data: { audioFeatures: features as object } });
```

### Include pattern — define as const for type inference
```typescript
const INCLUDE = {
  user: { select: { id: true, name: true } },
  votes: { select: { userId: true } },
} satisfies Prisma.ModelInclude;

export type ModelWithMeta = Prisma.ModelGetPayload<{ include: typeof INCLUDE }>;
```

### Enums — always import from `@prisma/client`
```typescript
import { TagType, Visibility, LyricsFetchStatus, FeatureStatus } from '@prisma/client';
// Never redeclare these locally
```

### After schema changes — mandatory sequence
```bash
npx prisma migrate dev --name <snake_case_description>
npx prisma generate   # REQUIRED — updates generated TS types
```

## Auth pattern
- [`src/auth/jwt-auth.guard.ts`](src/auth/jwt-auth.guard.ts) validates Bearer token, attaches `req.user = { id: string }`
- Apply at controller class level: `@UseGuards(JwtAuthGuard)`
- Access user: `@Req() req: AuthedRequest` — define `type AuthedRequest = { user: { id: string } }` in each controller file

## BullMQ queue pattern (optional Redis)
```typescript
// Inject with @Optional so service still works without Redis configured
@Optional() @InjectQueue(QUEUE_NAME) private queue: Queue | null
```
See [`src/lyrics-fetch/lyrics-fetch.module.ts`](src/lyrics-fetch/lyrics-fetch.module.ts) for reference.

## Spotify service key methods
File: [`src/spotify/spotify.service.ts`](src/spotify/spotify.service.ts)
- `getValidAccessToken(userId)` — handles token refresh automatically
- `getAudioFeatures(userId, spotifyId)` — checks `Song.audioFeatures` cache first, then Spotify API, caches result
- `getCurrentTrack(userId)` — returns `SpotifyCurrentlyPlayingResponse | null`
- **Route order**: `@Get('audio-features/:id')` must be before any `@Get(':id')` to avoid route conflicts

## Module → route map
| Module | Base route | Key responsibility |
|---|---|---|
| [`auth`](src/auth/) | `/auth` | Register, login, JWT, Spotify OAuth |
| [`spotify`](src/spotify/) | `/spotify` | Currently playing, search, audio-features, seek |
| [`saved-lyrics`](src/saved-lyrics/) | `/saved-lyrics` | User's saved songs (CRUD, visibility, tags) |
| [`songs`](src/songs/) | `/songs` | Shared canonical Song entities |
| [`song-lyrics`](src/song-lyrics/) | `/song-lyrics` | Shared structured lyrics per Song |
| [`song-tags`](src/song-tags/) | `/song-tags` | CONTEXT/MOOD tags on shared Songs |
| [`song-notes`](src/song-notes/) | `/song-notes` | Per-user notes on shared Songs |
| [`lyrics`](src/lyrics/) | `/lyrics` | Legacy per-SavedLyric structured lyrics |
| [`line-annotations`](src/line-annotations/) | `/line-annotations` | Per-line user annotations |
| [`lyrics-fetch`](src/lyrics-fetch/) | *(queue worker)* | Fetch from lyrics.ovh, update fetchStatus |
| [`search`](src/search/) | `/search` | Cross-entity full-text search |
| [`search-history`](src/search-history/) | `/search-history` | Spotify search history |
| [`library`](src/library/) | `/library` | Spotify library tracks + community insights |
| [`collections`](src/collections/) | `/collections` | Song collections (CRUD + items + reorder) |
| [`analytics`](src/analytics/) | `/analytics/me` | Words, emotions, artists, themes, timeline |
| [`digest`](src/digest/) | `/digest` | Weekly digest (cron Mon 08:00 + read endpoint) |
| [`feature-requests`](src/feature-requests/) | `/feature-requests` | Bugs + feature wishes (`kind` field) |

## Shared Song model (feat/saved-songs-rework)

The codebase is mid-migration from per-user lyrics to a shared canonical `Song` entity.

**Architecture goal:** `n users → n SavedLyric bookmarks → 1 Song → 1 SongLyrics`

**Rule for new code:** write to `Song`/`SongLyrics` — not to `SavedLyric.lyricsStructured` (legacy `Lyrics` model). Both models co-exist during migration; legacy data is still read where `Song`/`SongLyrics` hasn't been populated yet.

```
Song (1 per spotifyId, shared by all users)
  ├─ SongLyrics?        ← shared lyrics document (rawText + version + status)
  │    ├─ LyricsSection[]   ← label + startLine + position (verse/chorus/bridge)
  │    ├─ LyricsLine[]      ← shared; LineAnnotation[] is still per-user
  │    └─ LyricsVersion[]
  ├─ SongTag[]          ← shared community tags (addedBy: userId)
  └─ SongNote[]         ← per-user notes on the shared Song (replaces SavedLyric.note)

SavedLyric (user bookmark)
  ├─ songId → Song      ← NEW link (nullable during migration)
  ├─ note / isFavorite / visibility / listeningContext  ← stay per-user
  └─ lyricsStructured Lyrics?  ← LEGACY, do not write here in new code
```

See [REFACTORING_SHARED_LYRICS.md](../REFACTORING_SHARED_LYRICS.md) for full migration plan.

## Schema quick reference ([prisma/schema.prisma](prisma/schema.prisma))

### Enums
- `TagType`: `CONTEXT | MOOD`
- `Visibility`: `PRIVATE | FRIENDS | PUBLIC`
- `LyricsFetchStatus`: `IDLE | FETCHING | DONE | FAILED`
- `FeatureStatus`: `DRAFT | MUST_HAVE | WORKING_ON_IT | DONE | DECLINED`
- `LyricsStatus`: `DRAFT | WORK_IN_PROGRESS | FINISHED` (on `SongLyrics`)

### Models — shared Song layer (new)
| Model | Key fields | Notes |
|---|---|---|
| `Song` | `spotifyId` (unique), `title`, `artist`, `artists[]`, `fetchStatus`, `audioFeatures Json?` | One per Spotify track |
| `SongLyrics` | `songId` (unique), `rawText`, `version`, `lastEditedBy`, `status`, `lrclibSource` | One per Song |
| `LyricsSection` | `songLyricsId`, `label`, `startLine`, `position` | Verse/chorus/bridge markers |
| `SongTag` | `songId?`, `savedLyricId?`, `tag`, `type`, `addedBy?` | Either shared (songId) or legacy (savedLyricId) |
| `SongNote` | `songId`, `userId`, `text` — `@@unique([userId, songId])` | Per-user notes on shared Song |

### Models — per-user / legacy
| Model | Key fields | Notes |
|---|---|---|
| `SavedLyric` | `userId`, `songId?`, `spotifyId?` | Bookmark; `songId` link added in rework |
| `Lyrics` | `savedLyricId` | Legacy per-user structured lyrics — read-only in new code |
| `LyricsLine` | `lyricsId?`, `songLyricsId?`, `lineNumber`, `timestampMs?`, `singer?` | Works with both models |
| `LyricsVersion` | `lyricsId?`, `songLyricsId?` | Works with both models |
| `LineAnnotation` | `lineId`, `userId` — `@@unique([userId, lineId])` | Always per-user |
| `PlayHistory` | `userId`, `spotifyId`, `track`, `artist`, `artists[]`, `playedAt` | Index on `[userId, playedAt(sort: Desc)]` |
| `FeatureRequest` | `userId`, `kind` (`'feature'|'bug'`), `status FeatureStatus`, `page?` | Has `votes FeatureRequestVote[]` |
| `FeatureRequestVote` | `userId`, `requestId` — `@@unique([userId, requestId])` | Upvotes on feature requests |

### Artist fields pattern (SavedLyric, SearchHistory, LibraryTrack, Song, PlayHistory)
- `artist String` — primary/first artist (used for lyrics.ovh, analytics, sort)
- `artists String[]` — all artists stored separately
- Derive in service: `artist = artists[0] ?? ''`

