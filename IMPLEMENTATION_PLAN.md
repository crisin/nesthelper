# Implementation Plan — Lyrics Knowledge Base

> Based on `product_vision.md` and current codebase state (February 2026).
> Current stack: NestJS + Prisma + PostgreSQL + React 19 + Zustand + React Query

---

## Current State Summary

| Area | Status |
|------|--------|
| Auth (JWT, login) | ✅ Done |
| Spotify OAuth + token refresh | ✅ Done |
| Basic SavedLyric CRUD | ✅ Done |
| Search History + Community Feed | ✅ Done |
| Global LibraryTrack deduplication | ✅ Done |
| Lyrics versioning | ❌ Not started |
| Line-by-line structure | ❌ Not started |
| Annotations / personal meaning | ❌ Not started |
| Full-text / lyrics search | ❌ Not started |
| Collections | ❌ Not started |
| Analytics | ❌ Not started |
| AI features | ❌ Not started |

---

## Phase 1 — Core Lyrics Experience

**Goal:** Make the lyrics object the central, structured entity of the app.

---

### Feature 1: Lyrics Workspace (Song Detail 2.0)

**What changes:** `SavedLyric.lyrics` (plain `String`) becomes a structured, versioned, line-based object.

#### 1.1 Database Schema Changes

```prisma
// Replace plain lyrics String with structured model

model LyricsLine {
  id           String          @id @default(cuid())
  lyricsId     String
  lineNumber   Int
  text         String
  timestampMs  Int?            // optional: ms offset in song
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  lyrics       Lyrics          @relation(fields: [lyricsId], references: [id], onDelete: Cascade)
  annotations  LineAnnotation[]

  @@index([lyricsId, lineNumber])
}

model Lyrics {
  id           String         @id @default(cuid())
  savedLyricId String         @unique
  rawText      String         // always keep raw for search
  version      Int            @default(1)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  savedLyric   SavedLyric     @relation(fields: [savedLyricId], references: [id], onDelete: Cascade)
  lines        LyricsLine[]
  versions     LyricsVersion[]
}

model LyricsVersion {
  id        String   @id @default(cuid())
  lyricsId  String
  version   Int
  rawText   String   // snapshot of full text at that version
  diff      Json?    // optional: store changed lines as JSONB
  createdAt DateTime @default(now())
  lyrics    Lyrics   @relation(fields: [lyricsId], references: [id], onDelete: Cascade)

  @@index([lyricsId, version])
}
```

**Migration strategy:** Add new tables first. Backfill `Lyrics` rows from existing `SavedLyric.lyrics` strings (split by `\n`). Keep `SavedLyric.lyrics` column as soft-deprecated source of truth during transition, then remove after validation.

#### 1.2 Backend Changes

**New NestJS module: `lyrics`**

```
backend/src/lyrics/
├── lyrics.module.ts
├── lyrics.controller.ts    # REST endpoints
├── lyrics.service.ts       # Business logic
└── dto/
    ├── create-lyrics.dto.ts
    ├── update-lyrics.dto.ts
    └── lyrics-response.dto.ts
```

**Endpoints:**
```
GET    /lyrics/:savedLyricId          → full lyrics with lines
PUT    /lyrics/:savedLyricId          → replace full lyrics (creates new version)
PATCH  /lyrics/:savedLyricId/line/:lineId → update single line
GET    /lyrics/:savedLyricId/versions → version history list
GET    /lyrics/:savedLyricId/versions/:version → restore specific version
```

**Service logic for `PUT /lyrics/:id`:**
1. Fetch existing `Lyrics` record
2. Snapshot current `rawText` into `LyricsVersion`
3. Parse incoming text into lines (split by `\n`)
4. Upsert `LyricsLine` records (matched by lineNumber)
5. Increment `Lyrics.version`
6. Update `rawText` (used for search)

#### 1.3 Frontend Changes

**Update `SongDetail.tsx`:**
- Replace plain `<textarea>` with a line-by-line editor
- Each `LyricsLine` renders as an editable row
- Show version indicator ("v3 · last edited 2h ago")
- Version history panel: list of past versions with restore button

**New component: `LyricsLineEditor.tsx`**
- Row-based editing (similar to Notion blocks)
- Each line: text input + optional timestamp field
- Keyboard shortcut: `Enter` creates new line, `Backspace` on empty line merges up

---

### Feature 2: Personal Meaning Layer

**What changes:** Users can attach personal context to songs and individual lines.

#### 2.1 Database Schema Changes

```prisma
model SongNote {
  id           String     @id @default(cuid())
  savedLyricId String
  text         String
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  savedLyric   SavedLyric @relation(fields: [savedLyricId], references: [id], onDelete: Cascade)
}

model LineAnnotation {
  id         String     @id @default(cuid())
  lineId     String
  userId     String
  text       String
  emoji      String?    // single emoji shorthand
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  line       LyricsLine @relation(fields: [lineId], references: [id], onDelete: Cascade)
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([lineId])
}

model SongTag {
  id           String     @id @default(cuid())
  savedLyricId String
  tag          String     // e.g. "Gym", "Night Drive", "Breakup"
  type         TagType    @default(CONTEXT)
  createdAt    DateTime   @default(now())
  savedLyric   SavedLyric @relation(fields: [savedLyricId], references: [id], onDelete: Cascade)

  @@index([savedLyricId])
  @@index([tag])
}

enum TagType {
  CONTEXT   // user-defined context tags
  MOOD      // mood tags
}
```

#### 2.2 Backend Changes

**Extend `saved-lyrics` module:**

```
PATCH  /saved-lyrics/:id/note       → upsert SongNote
GET    /saved-lyrics/:id/note       → get note
POST   /saved-lyrics/:id/tags       → add tag(s)
DELETE /saved-lyrics/:id/tags/:tag  → remove tag
GET    /saved-lyrics/:id/tags       → list tags
```

**New `annotations` module:**

```
POST   /annotations/line/:lineId    → create LineAnnotation
PATCH  /annotations/:id             → update
DELETE /annotations/:id             → delete
GET    /annotations/line/:lineId    → all annotations for a line (own user)
```

#### 2.3 Frontend Changes

**`SongDetail.tsx` additions:**
- "My Note" section below lyrics (markdown textarea, auto-saved)
- Tag chips below song title (click to add/remove from preset list + custom)
- Per-line annotation: hover/tap a line → annotation popover appears

**New component: `TagSelector.tsx`**
- Preset suggestions: "Gym", "Night Drive", "Breakup", "Morning", "Road Trip", "Study"
- Plus free-text input for custom tags

---

### Feature 3: Smart Lyrics Search

**What changes:** Search finds lyrics content, not just song/artist names.

#### 3.1 Database Changes

```sql
-- Add to Lyrics table after migration:
ALTER TABLE "Lyrics" ADD COLUMN "search_vector" tsvector;
CREATE INDEX lyrics_search_idx ON "Lyrics" USING GIN("search_vector");

-- Trigger to update search_vector on rawText change:
CREATE OR REPLACE FUNCTION update_lyrics_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', NEW."rawText");
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lyrics_search_vector_update
  BEFORE INSERT OR UPDATE ON "Lyrics"
  FOR EACH ROW EXECUTE FUNCTION update_lyrics_search_vector();
```

```prisma
// In schema.prisma, add to Lyrics model:
searchVector  Unsupported("tsvector")?

// Also add pg_trgm index on SavedLyric track/artist
```

#### 3.2 Backend Changes

**New `search` module:**

```
GET /search?q=&type=lyrics|songs|tags&userId=mine|all
```

**Service logic:**

```typescript
// Full-text on lyrics content
WHERE search_vector @@ plainto_tsquery('english', query)

// Fuzzy on track/artist
WHERE track % query OR artist % query  -- pg_trgm similarity

// Tag search
WHERE tag ILIKE '%query%'
```

Return: `{ type: 'lyric_match' | 'song_match' | 'tag_match', score, song, matchedLines[] }`

#### 3.3 Frontend Changes

**Update global search in header/dashboard:**
- Search now returns categorized results
- "Lyrics" tab → shows matching lines with context
- "Songs" tab → track/artist match
- "Tags" tab → grouped by tag

---

## Phase 2 — Social Intelligence Layer

### Feature 4: Community Insights

**What changes:** Song pages show aggregated community engagement data.

#### 4.1 Database Changes

No new tables needed — derive from existing data.

Add a materialized view (refreshed periodically by cron):

```sql
CREATE MATERIALIZED VIEW community_line_stats AS
SELECT
  sl.track,
  sl.artist,
  ll."lineNumber",
  ll."text",
  COUNT(la.id) AS annotation_count,
  COUNT(DISTINCT la."userId") AS annotator_count
FROM "LyricsLine" ll
JOIN "Lyrics" ly ON ll."lyricsId" = ly.id
JOIN "SavedLyric" sl ON ly."savedLyricId" = sl.id
LEFT JOIN "LineAnnotation" la ON la."lineId" = ll.id
GROUP BY sl.track, sl.artist, ll."lineNumber", ll."text";
```

#### 4.2 Backend

```
GET /library/:spotifyId/insights
```

Returns:
- Most-annotated lines across all users
- Emotional distribution (based on SongTags)
- Total save count + contributor count

#### 4.3 Frontend

**`SongDetail.tsx` community panel (collapsed by default):**
- "N others saved this song"
- "Most highlighted line: ..." with heatmap-style background
- Tag cloud from community context tags

---

### Feature 5: Collections

**What changes:** Users can group songs (or specific lines) into themed collections.

#### 5.1 Database Schema

```prisma
model Collection {
  id          String           @id @default(cuid())
  userId      String
  name        String
  description String?
  isPublic    Boolean          @default(false)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  items       CollectionItem[]

  @@index([userId])
}

model CollectionItem {
  id           String      @id @default(cuid())
  collectionId String
  savedLyricId String?     // whole song
  lineId       String?     // or specific line
  position     Int         // for ordering
  addedAt      DateTime    @default(now())
  collection   Collection  @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  savedLyric   SavedLyric? @relation(fields: [savedLyricId], references: [id], onDelete: SetNull)
  line         LyricsLine? @relation(fields: [lineId], references: [id], onDelete: SetNull)

  @@index([collectionId, position])
}
```

#### 5.2 Backend

**New `collections` module:**

```
GET    /collections              → my collections
POST   /collections              → create
PATCH  /collections/:id          → rename/update
DELETE /collections/:id          → delete
POST   /collections/:id/items    → add song or line
DELETE /collections/:id/items/:itemId → remove item
PATCH  /collections/:id/items/reorder → drag-and-drop reorder
GET    /collections/public       → browse public collections
```

#### 5.3 Frontend

**New page: `/collections`**
- Grid of collection cards (cover art collage from songs inside)
- Create button → modal with name input

**New page: `/collections/:id`**
- List of songs/lines in collection
- Drag-to-reorder
- "Add song" button → opens search

---

### Feature 6: Privacy Controls

**What changes:** Each SavedLyric gets a visibility setting.

#### 6.1 Database Changes

```prisma
// Add to SavedLyric model:
visibility  Visibility  @default(PRIVATE)

enum Visibility {
  PRIVATE
  FRIENDS
  PUBLIC
}
```

#### 6.2 Backend

- Filter all community/library queries by `visibility != PRIVATE` (or `= PUBLIC`)
- Add `PATCH /saved-lyrics/:id` to update visibility
- Respect visibility in library aggregation queries

#### 6.3 Frontend

- Visibility toggle on `SongDetail.tsx` (icon: lock/users/globe)
- Filter toggle in `Discover` page to show only PUBLIC

---

## Phase 3 — Spotify-native Power Features

### Feature 7: Listening Context Capture

**What changes:** When a song is saved, record temporal context.

#### 7.1 Database Changes

```prisma
model ListeningContext {
  id           String     @id @default(cuid())
  savedLyricId String     @unique
  savedAt      DateTime   @default(now())
  hour         Int        // 0-23 for time-of-day queries
  dayOfWeek    Int        // 0-6
  deviceType   String?    // "smartphone", "computer", "speaker" (from Spotify API)
  sessionId    String?    // Spotify playback session ID if available
  savedLyric   SavedLyric @relation(fields: [savedLyricId], references: [id], onDelete: Cascade)
}
```

#### 7.2 Backend

Auto-create `ListeningContext` when `POST /saved-lyrics` is called:
- Extract hour, dayOfWeek from current timestamp
- Optionally call `GET /me/player` Spotify endpoint for device info

No new UI needed — data collected silently.

#### 7.3 Frontend

Used later by Analytics (Phase 4).

---

### Feature 8: Auto Lyrics Draft (AI Assist)

**What changes:** When a song is saved, optionally fetch + structure lyrics automatically.

#### 8.1 Architecture

- **Trigger:** `POST /saved-lyrics` emits a BullMQ job
- **Worker:** calls lyrics API (e.g., Genius or internal scraper), parses sections (Verse/Chorus/Bridge), creates `Lyrics` + `LyricsLine` records
- **Status polling:** frontend polls `GET /lyrics/:id/status` until ready

```
backend/src/workers/
├── lyrics-fetch.worker.ts   # BullMQ processor
└── lyrics-fetch.queue.ts    # Queue definition
```

**Dependencies to add:**
- `@nestjs/bullmq` + `bullmq` + Redis
- Lyrics source API client (Genius API or similar)

#### 8.2 Backend Changes

- Add Redis service to docker-compose.yml
- `BullMQ` queue in `app.module.ts`
- Worker calls external API → parses text → creates structured `Lyrics`

#### 8.3 Frontend Changes

- After saving: show "Fetching lyrics..." skeleton state
- On success: auto-populate lyrics workspace

---

### Feature 9: Lyrics → Spotify Navigation

**What changes:** Clicking a line with a timestamp seeks Spotify to that position.

#### 9.1 Backend

No backend changes — timestamps already stored on `LyricsLine.timestampMs`.

#### 9.2 Frontend

- `PUT /me/player/seek` Spotify API call (via backend proxy)
- New endpoint: `POST /spotify/seek?positionMs=`
- In `LyricsLineEditor.tsx`: timestamp lines show a "▶ jump" button
- **Karaoke mode:** if all lines have timestamps, auto-scroll the active line as song plays
  - Poll `GET /spotify/current-track` (every 1s in karaoke mode) → compare `progress_ms` → highlight active line

---

## Phase 4 — Deep Engagement (Retention Engine)

### Feature 10: Personal Lyrics Analytics

**What changes:** Analytics dashboard showing personal listening/saving patterns.

#### 10.1 Backend

```
GET /analytics/me/words         → top 50 words across all lyrics (exclude stopwords)
GET /analytics/me/emotions      → distribution of mood tags
GET /analytics/me/artists       → saved count per artist
GET /analytics/me/themes        → top context tags
GET /analytics/me/timeline      → saves grouped by week/month
```

All queries run against `SavedLyric`, `SongTag`, `Lyrics.rawText` for the authenticated user.

Word frequency: parse `rawText` server-side, strip stopwords, count lemmas.

#### 10.2 Frontend

**New page: `/analytics`**
- Word cloud component (use `react-wordcloud` or custom SVG)
- Bar chart: Top Artists by saves
- Pie chart: Mood distribution
- Line graph: saves over time (week by week)

---

### Feature 11: Memory Timeline

**What changes:** Chronological view of saved songs, grouped by month.

#### 11.1 Backend

```
GET /timeline?year=2025          → SavedLyrics grouped by month with mood aggregation
```

#### 11.2 Frontend

**New page: `/timeline`**
- Vertical scroll, month headers as anchors
- Song cards with tag chips
- Mood color coding per month (e.g., "March 2024 was mostly 💔")
- Jump to month navigator (year/month selector)

---

### Feature 12: Weekly Digest

**What changes:** Auto-generated personal summary, delivered in-app.

#### 12.1 Backend

- Cron job (every Monday 08:00): `InsightAggregator` service
- Generates `Digest` records per user
- Content: most-saved word, top new community annotation, recommended song (from similarity later)

```prisma
model Digest {
  id        String   @id @default(cuid())
  userId    String
  weekStart DateTime
  content   Json     // { topWord, topArtist, communityInsight, recommendation }
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### 12.2 Frontend

- Digest card on Dashboard (top of feed)
- Dismissable, links to relevant pages

---

## Phase 5 — Differentiating Killer Features

### Feature 13: Lyrics Similarity Engine

**What changes:** Find songs with semantically similar lyrics using vector embeddings.

#### 13.1 Architecture

- **Embedding model:** Use Claude API (`claude-haiku-4-5`) or OpenAI `text-embedding-3-small` to embed `Lyrics.rawText`
- **Storage:** `pgvector` PostgreSQL extension

```prisma
model LyricsEmbedding {
  id       String   @id @default(cuid())
  lyricsId String   @unique
  vector   Unsupported("vector(1536)")   // or 768 depending on model
  model    String   // track which embedding model was used
  createdAt DateTime @default(now())
  lyrics   Lyrics   @relation(fields: [lyricsId], references: [id], onDelete: Cascade)
}
```

```sql
CREATE INDEX ON "LyricsEmbedding" USING ivfflat (vector vector_cosine_ops)
  WITH (lists = 100);
```

- **Worker:** BullMQ job after lyrics are saved → embed → store
- **Query:** `SELECT * FROM LyricsEmbedding ORDER BY vector <=> $1 LIMIT 10`

#### 13.2 Backend

```
GET /similarity/:savedLyricId?limit=5   → top N similar songs from user's library
GET /library/:spotifyId/similar         → community-wide similar tracks
```

#### 13.3 Frontend

- "Similar Songs" section at bottom of `SongDetail.tsx`
- Horizontal scroll of song cards

---

### Feature 14: Quote Mode

**What changes:** Export a lyrics line as a styled shareable image.

#### 14.1 Backend

```
POST /quotes/generate
Body: { lineId, theme: 'dark'|'light'|'album' }
Returns: image/png (streamed)
```

**Implementation:**
- Use `node-canvas` or `puppeteer` to render styled HTML → PNG
- Album color: extract dominant color from `imgUrl` using `sharp`
- Overlay: artist name, track title, app watermark

#### 14.2 Frontend

- Per-line "Share" button in view mode → opens modal with preview
- Theme selector (dark / light / album art background)
- Download button + native share API (`navigator.share`)

---

### Feature 15: Mood-Driven Discovery

**What changes:** Query songs based on semantic meaning of user's annotations.

#### 15.1 Backend

```
GET /discover/mood?q=sad&source=notes|tags|lyrics
```

Logic:
1. If `source=tags`: filter by matching SongTag
2. If `source=notes`: full-text search on SongNote.text
3. If `source=lyrics`: vector similarity search using embedded query text

#### 15.2 Frontend

**`Discover.tsx` additions:**
- Mood search bar: "Show me songs like my sad ones"
- Results grid with match explanation ("Matched via: your note 'this song hurt'")

---

## Recommended Implementation Order

```
Week 1-2:   Feature 1 — Lyrics structure + versioning (DB migration + backend + basic UI)
Week 3:     Feature 2 — Annotations + tags
Week 4:     Feature 3 — Full-text search
Week 5:     Feature 6 — Privacy controls (small, high impact)
Week 6-7:   Feature 5 — Collections
Week 8:     Feature 7 — Listening context capture (backend only, silent)
Week 9:     Feature 4 — Community insights
Week 10:    Feature 10 — Analytics dashboard (backend queries + charts)
Week 11:    Feature 11 — Timeline view
Week 12:    Feature 12 — Weekly digest (cron)
Week 13-14: Feature 8 — AI lyrics fetch (Redis + BullMQ + external API)
Week 15:    Feature 9 — Spotify seek + karaoke mode
Week 16-17: Feature 13 — Similarity engine (pgvector + embeddings)
Week 18:    Feature 14 — Quote mode (canvas/puppeteer)
Week 19:    Feature 15 — Mood-driven discovery
```

---

## Infrastructure Changes Needed

| Addition | Why | When |
|----------|-----|------|
| Redis | BullMQ job queues | Before Feature 8 |
| pgvector extension | Vector similarity search | Before Feature 13 |
| External lyrics API key | Auto-draft lyrics | Before Feature 8 |
| Claude/OpenAI API key | Embeddings | Before Feature 13 |
| `node-canvas` or Puppeteer | Quote image generation | Before Feature 14 |
| Cron service in NestJS | Digest generation | Before Feature 12 |

```yaml
# docker-compose.yml addition for Redis:
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
```

---

## Migration Backfill Strategy

When adding `Lyrics` + `LyricsLine` tables:

1. Create tables (migration)
2. Run one-time backfill script:
   ```typescript
   // scripts/backfill-lyrics.ts
   const saved = await prisma.savedLyric.findMany({ where: { lyrics: { not: '' } } });
   for (const s of saved) {
     const lines = s.lyrics.split('\n').filter(l => l.trim());
     await prisma.lyrics.create({
       data: {
         savedLyricId: s.id,
         rawText: s.lyrics,
         lines: { create: lines.map((text, i) => ({ lineNumber: i + 1, text })) }
       }
     });
   }
   ```
3. Keep `SavedLyric.lyrics` until all features read from `Lyrics` table
4. Final migration: drop `SavedLyric.lyrics` column

---

## Key Design Decisions

1. **Structured lyrics are optional** — `Lyrics` table is nullable per `SavedLyric`. Songs without lyrics still work.
2. **rawText is always maintained** — Required for full-text search, even when lines exist. Keep in sync on every edit.
3. **Versioning is append-only** — Never delete `LyricsVersion` rows. Keep them cheap (only store diffs or snapshots of small texts).
4. **Embeddings are async** — Never block the save operation waiting for an embedding. Use BullMQ.
5. **Community queries respect privacy** — All `JOIN` across users filter `WHERE visibility = 'PUBLIC'`.
6. **Collections allow line-level granularity** — `CollectionItem` references either a whole `SavedLyric` OR a `LyricsLine`. This enables "Best Rap Punchlines" collections.
