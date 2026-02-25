/**
 * Backfill script: converts existing SavedLyric.lyrics plain strings
 * into structured Lyrics + LyricsLine records.
 *
 * Run once after the Phase 1 migration:
 *   npx ts-node scripts/backfill-lyrics.ts
 *
 * Safe to run multiple times (idempotent – skips already-converted songs).
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5433/spotify-db',
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const songs = await prisma.savedLyric.findMany({
    where: {
      lyrics: { not: '' },
      lyricsStructured: null, // skip already converted
    },
    select: { id: true, lyrics: true },
  });

  console.log(`Found ${songs.length} songs to backfill.`);

  let done = 0;
  let skipped = 0;

  for (const song of songs) {
    if (!song.lyrics.trim()) {
      skipped++;
      continue;
    }

    const lines = song.lyrics.split('\n');

    await prisma.lyrics.create({
      data: {
        savedLyricId: song.id,
        rawText: song.lyrics,
        lines: {
          create: lines.map((text, i) => ({ lineNumber: i + 1, text })),
        },
      },
    });

    done++;
    if (done % 50 === 0) {
      console.log(`  ${done}/${songs.length} converted…`);
    }
  }

  console.log(`Done. Converted: ${done}, skipped (empty): ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
