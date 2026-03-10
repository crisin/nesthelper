# Refactoring Plan: Shared Song & Lyrics Model

## Problem Statement

Currently, every `SavedLyric` row is per-user. If userA writes lyrics for a song and sets them public, userB sees them in a "Community Lyrics" overlay — but userB's own song detail page is completely separate with empty lyrics. There is no single source of truth for a song's lyrics, tags, or metadata.

**Target model:** `n users → n saves → 1 Song → 1 Lyrics document`

---

## Current Data Model (simplified)

```
User
  └─ SavedLyric (per user, per song)
       ├─ lyrics: String          ← plain text, per user
       ├─ track / artist / artists
       ├─ spotifyId
       ├─ note, isFavorite, visibility
       ├─ videoUrl, fetchStatus
       ├─ SongTag[]               ← per user
       └─ Lyrics (structured)     ← per user
            ├─ LyricsLine[]
            │    └─ LineAnnotation[] (per user, per line)
            └─ LyricsVersion[]

LibraryTrack                      ← separate sync cache, no lyrics
```

---

## Target Data Model

```
Song (1 per spotifyId, shared by all)
  ├─ spotifyId (unique)
  ├─ title / artist / artists / imgUrl / spotifyUrl
  ├─ videoUrl
  ├─ fetchStatus
  ├─ SongTag[]          ← shared, community tags (addedBy: userId)
  └─ SongLyrics         ← ONE shared lyrics document
       ├─ rawText
       ├─ version
       ├─ lastEditedBy: userId
       ├─ LyricsLine[]
       │    └─ LineAnnotation[]  (still per user — personal meaning layer)
       └─ LyricsVersion[]

User
  └─ SavedLyric (user bookmark to a Song)
       ├─ songId → Song
       ├─ note             ← personal, stays per user
       ├─ isFavorite       ← personal
       ├─ visibility       ← user's preference for their bookmark
       └─ ListeningContext ← personal

LibraryTrack → merged into Song (Song absorbs all LibraryTrack fields)
```

---

## Schema Changes

### New model: `Song`

Replaces `LibraryTrack` and consolidates per-song shared data.

```prisma
model Song {
  id          String            @id @default(cuid())
  spotifyId   String            @unique
  title       String
  artist      String            // primary (first) artist
  artists     String[]          @default([])
  imgUrl      String?
  spotifyUrl  String?
  videoUrl    String?
  fetchStatus LyricsFetchStatus @default(IDLE)
  firstSeenAt DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  lyrics  SongLyrics?
  tags    SongTag[]
  savedBy SavedLyric[]
}
```

### Renamed/moved: `Lyrics` → `SongLyrics`

Foreign key changes from `savedLyricId` to `songId`.

```prisma
model SongLyrics {
  id           String   @id @default(cuid())
  songId       String   @unique
  rawText      String   @default("")
  version      Int      @default(1)
  lastEditedBy String?  // userId
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  song     Song            @relation(fields: [songId], references: [id], onDelete: Cascade)
  lines    LyricsLine[]
  versions LyricsVersion[]
}
```

### Updated: `SavedLyric`

Becomes a user bookmark. Loses all song-metadata and lyrics fields.

```prisma
model SavedLyric {
  id         String     @id @default(cuid())
  userId     String
  songId     String                         // ← replaces spotifyId + searchHistoryId
  note       String?
  isFavorite Boolean    @default(false)
  visibility Visibility @default(PRIVATE)
  createdAt  DateTime   @default(now())

  user             User             @relation(...)
  song             Song             @relation(...)
  listeningContext ListeningContext?
  collectionItems  CollectionItem[]

  @@unique([userId, songId])
}
```

**Fields removed from SavedLyric:** `lyrics`, `track`, `artist`, `artists`, `spotifyId`, `searchHistoryId`, `note` stays, `videoUrl` → moved to `Song`, `fetchStatus` → moved to `Song`, `tags` → moved to `Song`.

### Updated: `SongTag`

Moves from `savedLyricId` to `songId`. Adds `addedBy` for attribution.

```prisma
model SongTag {
  id        String   @id @default(cuid())
  songId    String
  tag       String
  type      TagType  @default(CONTEXT)
  addedBy   String   // userId — for display and future moderation
  createdAt DateTime @default(now())

  song Song @relation(fields: [songId], references: [id], onDelete: Cascade)

  @@unique([songId, tag])
  @@index([songId])
}
```

### Updated: `LyricsLine`

Foreign key changes from `lyricsId → Lyrics` to `lyricsId → SongLyrics`. No structural change.

### Updated: `CollectionItem`

`savedLyricId` still references `SavedLyric` (user bookmark). No change needed here since the bookmark still exists, it just points to a `Song` instead of owning all the data.

### Removed: `LibraryTrack`

All fields are absorbed into `Song`. The Spotify sync job now upserts `Song` records instead of `LibraryTrack` records.

### Removed: `SearchHistory → SavedLyric` relation

`SearchHistory` loses its `savedLyrics SavedLyric[]` relation. It can retain its standalone existence as a search log. The `Song` is the canonical entity going forward.

---

## API Changes

### Lyrics endpoints (`/lyrics/*`)

| Old | New | Notes |
|-----|-----|-------|
| `GET /lyrics/:savedLyricId` | `GET /songs/:spotifyId/lyrics` | Shared doc |
| `PUT /lyrics/:savedLyricId` | `PUT /songs/:spotifyId/lyrics` | Any authed user can edit |
| `POST /lyrics/:savedLyricId/restore/:version` | `POST /songs/:spotifyId/lyrics/restore/:version` | Shared history |

### Tags endpoints

| Old | New |
|-----|-----|
| `GET /saved-lyrics/:id/tags` | `GET /songs/:spotifyId/tags` |
| `POST /saved-lyrics/:id/tags` | `POST /songs/:spotifyId/tags` |
| `DELETE /saved-lyrics/:id/tags/:tag` | `DELETE /songs/:spotifyId/tags/:tag` |

### Video URL

| Old | New |
|-----|-----|
| `PATCH /saved-lyrics/:id/video` | `PATCH /songs/:spotifyId/video` |

### SavedLyric endpoints (bookmarks only)

Most remain similar but the response shape changes — song data is now nested under `song.*` instead of flat on `SavedLyric`.

```jsonc
// Old SavedLyric response
{ "id": "...", "track": "Song Name", "artist": "Artist", "lyrics": "...", "tags": [...] }

// New SavedLyric response
{
  "id": "...",
  "note": null,
  "isFavorite": true,
  "visibility": "PRIVATE",
  "song": {
    "spotifyId": "...",
    "title": "Song Name",
    "artist": "Artist",
    "artists": ["Artist"],
    "imgUrl": "...",
    "videoUrl": null,
    "fetchStatus": "DONE",
    "lyrics": { "rawText": "...", "version": 3, "lines": [...] },
    "tags": [...]
  }
}
```

### Library endpoint

`GET /library` replaces `GET /library/tracks` and queries `Song` instead of `LibraryTrack`.

### Community features simplified

- `GET /saved-lyrics/public-lyrics/:spotifyId` → **removed** (all users already share the same lyrics)
- `GET /library/by-spotify/:spotifyId/insights` → simplify: `saveCount` still makes sense, `tagDistribution` now comes from `Song.tags`, `mostAnnotatedLines` still relevant

---

## New Backend Module Structure

```
backend/src/
  songs/
    songs.module.ts        ← new, replaces most of saved-lyrics + library
    songs.service.ts       ← Song CRUD, upsert by spotifyId
    songs.controller.ts    ← GET /songs/:spotifyId
  song-lyrics/
    song-lyrics.module.ts  ← replaces lyrics module
    song-lyrics.service.ts ← edit, restore, BullMQ fetch
    song-lyrics.controller.ts
  song-tags/
    song-tags.module.ts    ← replaces tag logic in saved-lyrics
    song-tags.service.ts
    song-tags.controller.ts
  saved-lyrics/            ← becomes "bookmarks"
    saved-lyrics.service.ts  ← only: create bookmark, delete, note, isFavorite, visibility
    saved-lyrics.controller.ts
```

---

## Frontend Changes

### Type updates (`types/index.ts`)

```typescript
// New: canonical song entity
interface Song {
  id: string
  spotifyId: string
  title: string
  artist: string
  artists: string[]
  imgUrl?: string | null
  spotifyUrl?: string | null
  videoUrl?: string | null
  fetchStatus: LyricsFetchStatus
  lyrics?: SongLyrics | null
  tags?: SongTag[]
}

// Updated: SongTag now has addedBy
interface SongTag {
  id: string
  tag: string
  type: 'CONTEXT' | 'MOOD'
  addedBy: string
  createdAt: string
}

// Updated: bookmark only
interface SavedLyric {
  id: string
  note?: string | null
  isFavorite: boolean
  visibility: Visibility
  createdAt: string
  song: Song
}

// Renamed from StructuredLyrics
interface SongLyrics {
  id: string
  songId: string
  rawText: string
  version: number
  lastEditedBy?: string | null
  updatedAt: string
  lines: LyricsLine[]
  versions: LyricsVersion[]
}
```

### Component updates

| Component | Change |
|-----------|--------|
| `LyricsEditor` | Props: `spotifyId` instead of `savedLyricId`. Hits `/songs/:spotifyId/lyrics`. |
| `TagSelector` | Props: `spotifyId` instead of `savedLyricId`. Hits `/songs/:spotifyId/tags`. |
| `SongDetail` | Reads `song.song.*` for shared data; `song.note`, `song.isFavorite` for personal data. Remove `CommunityLyricsPanel` (now irrelevant). |
| `VideoSection` | Hits `PATCH /songs/:spotifyId/video`. |
| `Discover` | Queries `Song` records directly. `LibraryTrack` type removed. |
| `Analytics` | Tag queries now aggregate from `Song.tags` filtered by user's saved songs. |

---

## Data Migration Script

Location: `backend/scripts/migrate-shared-lyrics.ts`

### Algorithm

```
For each unique spotifyId across SavedLyric + LibraryTrack:

  1. Create Song record
     - Metadata priority: LibraryTrack → SavedLyric (most recent)
     - Copy: spotifyId, title/track, artist, artists, imgUrl, spotifyUrl, videoUrl

  2. Resolve lyrics conflict (pick the richest content)
     a. Collect all SavedLyric.lyrics (plain text) for this spotifyId
     b. Collect all Lyrics.rawText (structured) for this spotifyId
     c. Winner = entry with max(length(rawText)), prefer structured Lyrics over plain if tied
     d. Create SongLyrics from winner
     e. Copy LyricsLine[], LyricsVersion[] from winning Lyrics record

  3. Resolve tags (merge without conflict)
     - Collect all SongTag rows from all SavedLyric records for this spotifyId
     - Deduplicate by (tag, type) — keep earliest createdAt, preserve addedBy
     - Create SongTag records on the Song

  4. Update each SavedLyric to bookmark format
     - Set songId = Song.id
     - Keep: note, isFavorite, visibility, createdAt, listeningContext
     - Nullify/drop: lyrics, track, artist, artists, spotifyId, searchHistoryId, videoUrl, fetchStatus

  5. Update CollectionItem references (no change needed, savedLyricId still valid)

  6. Drop LibraryTrack rows for migrated songs (now covered by Song)
```

### Conflict resolution summary

| Field | Strategy |
|-------|----------|
| lyrics rawText | Longest string wins |
| structured lines | From the same source as the winning rawText |
| version history | Merge all versions, renumber chronologically |
| tags | Union of all tags; duplicates dropped |
| videoUrl | First non-null value wins |
| fetchStatus | `DONE` if any source has it, else most advanced status |
| imgUrl / metadata | LibraryTrack preferred, else most recent SavedLyric |

---

## Migration Steps (execution order)

```bash
# 1. Run Prisma migration for new schema
npx prisma migrate dev --name shared_song_lyrics

# 2. Run data migration script (non-destructive first pass)
npx ts-node scripts/migrate-shared-lyrics.ts --dry-run

# 3. Review dry-run output, then apply
npx ts-node scripts/migrate-shared-lyrics.ts --apply

# 4. Verify row counts and spot-check data
npx ts-node scripts/verify-migration.ts

# 5. Deploy updated backend (new API endpoints live)
# 6. Deploy updated frontend
```

The migration script should be **idempotent** (safe to re-run) and **non-destructive** (old columns kept until verification passes).

---

## Feature Impact Summary

| Feature | Impact |
|---------|--------|
| Favorites / SavedLyrics list | Reads bookmark + joined `song.*` data. Minor response shape change. |
| SongDetail page | Simplified: one set of lyrics, one set of tags. Remove CommunityLyricsPanel. |
| LyricsEditor | Now edits a shared document. Last-writer-wins on save. Version history becomes community history. |
| Timeline / Analytics | Aggregate over user's saved Song IDs. Tags queried from `Song.tags`. |
| Collections | `CollectionItem.savedLyricId` still valid (bookmark IDs don't change). |
| Discover / Library | Queries `Song` table. `LibraryTrack` type removed. |
| Community Insights | Simplified: `saveCount` = `Song.savedBy.length`. Tags from `Song.tags` directly. |
| CommunityLyricsPanel | **Removed** — all users share one document. |
| Digest / Cron | Adjust DigestService to read from `Song` and `SavedLyric` join. |
| BullMQ lyrics fetch | Processor writes to `SongLyrics` via `songId` instead of `savedLyricId`. |
| LineAnnotation | No change — already per-user per line. Lines now belong to `SongLyrics`. |

---

## Open Questions / Decisions Needed

1. **Tag ownership**: Any user can add a tag to a Song. Can any user remove any tag, or only their own? Recommend: any user can remove — it's collaborative.
Answer: any user can remove tags or any data of a song

2. **Edit conflicts**: If two users edit lyrics simultaneously, last-writer-wins is simple but lossy. Consider optimistic locking (reject if `version` mismatch) or operational transforms later.
Answer: we go with optimistic locking but i'm open for suggestions. its less than 10 people using this software, we dont want to expand it.

3. **Visibility semantics**: After the refactor, what does `SavedLyric.visibility` mean? The lyrics are shared regardless. Proposal: `visibility` controls whether the user's *bookmark* (note, isFavorite) appears in community counts / analytics. Keep it for future personal features.
Answer: throw it out completly. this should be handeld on account level and not song level.

4. **SearchHistory**: Can be kept as-is (search log) or cleaned up. No functional role in the new model.
Anwer: there should be a global search history and a personal search history. these two features are expected but a clean up also helps.

5. **Unauthenticated song reads**: Should `GET /songs/:spotifyId/lyrics` be public (no auth)? Currently no public endpoints. Defer to later.
Answer: This is a private app. nothing but the login should be accessible without being logged in.

---

## Implementation Order

1. **Schema + migration** (Prisma + data script)
2. **Backend: `SongsModule`** — upsert by spotifyId, replace LibraryTrack sync
3. **Backend: `SongLyricsModule`** — port from LyricsModule with new FK
4. **Backend: `SongTagsModule`** — port from tag methods in SavedLyricsController
5. **Backend: `SavedLyricsModule`** — strip down to bookmark operations
6. **Backend: Update Analytics, Digest, BullMQ processor**
7. **Frontend: types** — new Song, SongLyrics shapes
8. **Frontend: SongDetail + LyricsEditor + TagSelector** — new endpoint paths
9. **Frontend: Discover, Analytics, Timeline** — Song instead of LibraryTrack
10. **Frontend: Remove CommunityLyricsPanel** — no longer needed
