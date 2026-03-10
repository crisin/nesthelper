/**
 * Data migration script: per-user lyrics → shared Song/SongLyrics model
 *
 * Run AFTER applying Phase A schema migration:
 *   npx prisma migrate dev --name shared_lyrics_add
 *
 * Then run this script:
 *   npx ts-node scripts/migrate-shared-lyrics.ts
 *
 * Then apply Phase B schema (schema_final.prisma → schema.prisma):
 *   npx prisma migrate dev --name shared_lyrics_cleanup
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('╔════════════════════════════════════════════╗')
  console.log('║   Shared Lyrics Migration                  ║')
  console.log('╚════════════════════════════════════════════╝\n')

  // ── Step 1: Create Song records ─────────────────────────────────────────

  console.log('Step 1: Creating Song records...')

  // From LibraryTrack (preferred metadata source)
  const libTracks = await prisma.$queryRaw<
    {
      id: string
      spotifyId: string
      name: string
      artist: string
      artists: string[]
      imgUrl: string | null
      url: string
      firstSeenAt: Date
    }[]
  >`SELECT id, "spotifyId", name, artist, artists, "imgUrl", url, "firstSeenAt" FROM "LibraryTrack"`

  for (const lt of libTracks) {
    await (prisma as any).song.upsert({
      where: { spotifyId: lt.spotifyId },
      create: {
        spotifyId: lt.spotifyId,
        title: lt.name,
        artist: lt.artist,
        artists: lt.artists || [],
        imgUrl: lt.imgUrl,
        spotifyUrl: lt.url,
        fetchStatus: 'IDLE',
        firstSeenAt: lt.firstSeenAt,
      },
      update: {},
    })
  }
  console.log(`  → Created ${libTracks.length} Song records from LibraryTrack`)

  // From SavedLyric (for any spotifyId not yet in Song)
  const savedLyrics = await prisma.$queryRaw<
    {
      spotifyId: string
      track: string
      artist: string
      artists: string[]
      videoUrl: string | null
      fetchStatus: string
      createdAt: Date
      sh_imgUrl: string | null
    }[]
  >`
    SELECT DISTINCT ON (sl."spotifyId")
      sl."spotifyId", sl.track, sl.artist, sl.artists,
      sl."videoUrl", sl."fetchStatus", sl."createdAt",
      sh."imgUrl" AS sh_imgUrl
    FROM "SavedLyric" sl
    LEFT JOIN "SearchHistory" sh ON sh.id = sl."searchHistoryId"
    WHERE sl."spotifyId" IS NOT NULL
    ORDER BY sl."spotifyId", sl."createdAt" DESC
  `

  let fromSavedLyric = 0
  for (const sl of savedLyrics) {
    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Song" WHERE "spotifyId" = ${sl.spotifyId} LIMIT 1
    `
    if (existing.length > 0) continue

    await (prisma as any).song.create({
      data: {
        spotifyId: sl.spotifyId,
        title: sl.track,
        artist: sl.artist,
        artists: sl.artists || [],
        imgUrl: sl.sh_imgUrl,
        videoUrl: sl.videoUrl,
        fetchStatus: (sl.fetchStatus || 'IDLE') as any,
        firstSeenAt: sl.createdAt,
      },
    })
    fromSavedLyric++
  }
  console.log(`  → Created ${fromSavedLyric} additional Song records from SavedLyric`)

  // Update videoUrl where Song has none but SavedLyric has one
  await prisma.$executeRaw`
    UPDATE "Song" s
    SET "videoUrl" = sub."videoUrl"
    FROM (
      SELECT DISTINCT ON (sl."spotifyId") sl."spotifyId", sl."videoUrl"
      FROM "SavedLyric" sl
      WHERE sl."spotifyId" IS NOT NULL AND sl."videoUrl" IS NOT NULL AND sl."videoUrl" != ''
      ORDER BY sl."spotifyId", sl."createdAt" DESC
    ) sub
    WHERE s."spotifyId" = sub."spotifyId" AND (s."videoUrl" IS NULL OR s."videoUrl" = '')
  `

  // fetchStatus: promote to DONE if any user had DONE
  await prisma.$executeRaw`
    UPDATE "Song" s
    SET "fetchStatus" = 'DONE'::"LyricsFetchStatus"
    WHERE EXISTS (
      SELECT 1 FROM "SavedLyric" sl
      WHERE sl."spotifyId" = s."spotifyId"
        AND sl."fetchStatus" = 'DONE'::"LyricsFetchStatus"
    )
  `

  const songCount = await prisma.$queryRaw<{ cnt: bigint }[]>`SELECT COUNT(*) AS cnt FROM "Song"`
  console.log(`  → Total Song records: ${songCount[0].cnt}`)

  // ── Step 2: Create SongLyrics (best rawText per song) ───────────────────

  console.log('\nStep 2: Creating SongLyrics records...')

  const allSongs = await prisma.$queryRaw<{ id: string; spotifyId: string }[]>`
    SELECT id, "spotifyId" FROM "Song"
  `

  let lyricsCreated = 0
  let lyricsSkipped = 0

  for (const song of allSongs) {
    // Try structured Lyrics first (longest rawText wins)
    const structuredWinner = await prisma.$queryRaw<
      { id: string; rawText: string; version: number; userId: string; createdAt: Date }[]
    >`
      SELECT l.id, l."rawText", l.version, sl."userId", sl."createdAt"
      FROM "Lyrics" l
      JOIN "SavedLyric" sl ON sl.id = l."savedLyricId"
      WHERE sl."spotifyId" = ${song.spotifyId}
        AND LENGTH(l."rawText") > 0
      ORDER BY LENGTH(l."rawText") DESC, l."createdAt" DESC
      LIMIT 1
    `

    if (structuredWinner.length > 0) {
      const w = structuredWinner[0]
      const sl = await (prisma as any).songLyrics.upsert({
        where: { songId: song.id },
        create: {
          songId: song.id,
          rawText: w.rawText,
          version: w.version,
          lastEditedBy: w.userId,
        },
        update: {},
      })

      // Migrate LyricsLine rows from the winning Lyrics record
      await prisma.$executeRaw`
        UPDATE "LyricsLine"
        SET "songLyricsId" = ${sl.id}
        WHERE "lyricsId" = ${w.id}
      `

      // Migrate LyricsVersion rows from the winning Lyrics record
      await prisma.$executeRaw`
        UPDATE "LyricsVersion"
        SET "songLyricsId" = ${sl.id}
        WHERE "lyricsId" = ${w.id}
      `

      lyricsCreated++
      continue
    }

    // Fallback: plain text lyrics (longest wins)
    const plainWinner = await prisma.$queryRaw<
      { lyrics: string; userId: string; createdAt: Date }[]
    >`
      SELECT lyrics, "userId", "createdAt"
      FROM "SavedLyric"
      WHERE "spotifyId" = ${song.spotifyId}
        AND LENGTH(lyrics) > 0
      ORDER BY LENGTH(lyrics) DESC
      LIMIT 1
    `

    if (plainWinner.length > 0) {
      const w = plainWinner[0]
      await (prisma as any).songLyrics.upsert({
        where: { songId: song.id },
        create: {
          songId: song.id,
          rawText: w.lyrics,
          version: 1,
          lastEditedBy: w.userId,
        },
        update: {},
      })
      lyricsCreated++
    } else {
      lyricsSkipped++
    }
  }

  console.log(`  → Created: ${lyricsCreated}, skipped (no lyrics): ${lyricsSkipped}`)

  // ── Step 3: Migrate SongTag to Song level ──────────────────────────────

  console.log('\nStep 3: Migrating SongTag to Song level...')

  // Set songId + addedBy from the SavedLyric the tag belongs to
  await prisma.$executeRaw`
    UPDATE "SongTag" st
    SET "songId"  = sl."songId",
        "addedBy" = sl."userId"
    FROM "SavedLyric" sl
    WHERE sl.id = st."savedLyricId"
      AND sl."songId" IS NOT NULL
      AND st."songId" IS NULL
  `

  // Wait — SavedLyric.songId hasn't been set yet! We need Step 4 first for the above to work.
  // Fix: populate SavedLyric.songId first, then come back to SongTag.
  // (Steps 3 and 4 are swapped — let's redo SongTag after step 4)

  // ── Step 4: Set SavedLyric.songId ─────────────────────────────────────

  console.log('\nStep 4: Setting SavedLyric.songId...')

  // Via spotifyId
  await prisma.$executeRaw`
    UPDATE "SavedLyric" sl
    SET "songId" = s.id
    FROM "Song" s
    WHERE s."spotifyId" = sl."spotifyId"
      AND sl."songId" IS NULL
  `

  // Via searchHistory.spotifyId for SavedLyrics with no spotifyId
  await prisma.$executeRaw`
    UPDATE "SavedLyric" sl
    SET "songId" = s.id
    FROM "SearchHistory" sh
    JOIN "Song" s ON s."spotifyId" = sh."spotifyId"
    WHERE sl."searchHistoryId" = sh.id
      AND sl."songId" IS NULL
  `

  const orphaned = await prisma.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*) AS cnt FROM "SavedLyric" WHERE "songId" IS NULL
  `
  console.log(`  → SavedLyric records without songId (will be removed in cleanup): ${orphaned[0].cnt}`)

  // ── Step 3 (revisited): Migrate SongTag now that SavedLyric.songId is set ──

  await prisma.$executeRaw`
    UPDATE "SongTag" st
    SET "songId"  = sl."songId",
        "addedBy" = sl."userId"
    FROM "SavedLyric" sl
    WHERE sl.id = st."savedLyricId"
      AND sl."songId" IS NOT NULL
      AND st."songId" IS NULL
  `

  // Deduplicate SongTag: keep earliest per (songId, tag)
  await prisma.$executeRaw`
    DELETE FROM "SongTag"
    WHERE id NOT IN (
      SELECT DISTINCT ON ("songId", tag) id
      FROM "SongTag"
      WHERE "songId" IS NOT NULL
      ORDER BY "songId", tag, "createdAt" ASC
    )
    AND "songId" IS NOT NULL
  `

  const tagCount = await prisma.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*) AS cnt FROM "SongTag" WHERE "songId" IS NOT NULL
  `
  console.log(`  → SongTag records migrated: ${tagCount[0].cnt}`)

  // ── Summary ────────────────────────────────────────────────────────────

  console.log('\n╔════════════════════════════════════════════╗')
  console.log('║   Migration Summary                        ║')
  console.log('╚════════════════════════════════════════════╝')

  const stats = await prisma.$queryRaw<
    { songs: bigint; lyrics: bigint; saved: bigint; orphaned: bigint; tags: bigint }[]
  >`
    SELECT
      (SELECT COUNT(*) FROM "Song")                                     AS songs,
      (SELECT COUNT(*) FROM "SongLyrics")                               AS lyrics,
      (SELECT COUNT(*) FROM "SavedLyric")                               AS saved,
      (SELECT COUNT(*) FROM "SavedLyric" WHERE "songId" IS NULL)        AS orphaned,
      (SELECT COUNT(*) FROM "SongTag" WHERE "songId" IS NOT NULL)       AS tags
  `

  const s = stats[0]
  console.log(`  Songs created:          ${s.songs}`)
  console.log(`  SongLyrics created:     ${s.lyrics}`)
  console.log(`  SavedLyrics total:      ${s.saved}`)
  console.log(`  SavedLyrics orphaned:   ${s.orphaned}  ← should be 0`)
  console.log(`  SongTags migrated:      ${s.tags}`)

  console.log('\n✓ Migration complete.')
  console.log('\nNEXT STEPS:')
  console.log('  1. Review numbers above (orphaned should be 0)')
  console.log('  2. Copy schema_final.prisma over schema.prisma')
  console.log('  3. Run: npx prisma migrate dev --name shared_lyrics_cleanup')
  console.log('  4. Rebuild and restart backend + frontend')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
