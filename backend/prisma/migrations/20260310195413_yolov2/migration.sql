/*
  Warnings:

  - A unique constraint covering the columns `[userId,songId]` on the table `SavedLyric` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[songId,tag]` on the table `SongTag` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "LyricsLine" ALTER COLUMN "lyricsId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "LyricsVersion" ALTER COLUMN "lyricsId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SavedLyric" ALTER COLUMN "lyrics" SET DEFAULT '',
ALTER COLUMN "track" SET DEFAULT '',
ALTER COLUMN "artist" SET DEFAULT '';

-- AlterTable
ALTER TABLE "SongTag" ALTER COLUMN "savedLyricId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "LyricsLine_songLyricsId_lineNumber_idx" ON "LyricsLine"("songLyricsId", "lineNumber");

-- CreateIndex
CREATE INDEX "LyricsVersion_songLyricsId_version_idx" ON "LyricsVersion"("songLyricsId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "SavedLyric_userId_songId_key" ON "SavedLyric"("userId", "songId");

-- CreateIndex
CREATE UNIQUE INDEX "SongTag_songId_tag_key" ON "SongTag"("songId", "tag");

-- AddForeignKey
ALTER TABLE "LyricsLine" ADD CONSTRAINT "LyricsLine_songLyricsId_fkey" FOREIGN KEY ("songLyricsId") REFERENCES "SongLyrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LyricsVersion" ADD CONSTRAINT "LyricsVersion_songLyricsId_fkey" FOREIGN KEY ("songLyricsId") REFERENCES "SongLyrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongTag" ADD CONSTRAINT "SongTag_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
