-- CreateEnum
CREATE TYPE "LyricsStatus" AS ENUM ('DRAFT', 'WORK_IN_PROGRESS', 'FINISHED');

-- AlterTable
ALTER TABLE "LyricsLine" ADD COLUMN     "singer" TEXT;

-- AlterTable
ALTER TABLE "SavedLyric" ADD COLUMN     "artistColors" JSONB;

-- AlterTable
ALTER TABLE "SongLyrics" ADD COLUMN     "status" "LyricsStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "LyricsSection" (
    "id" TEXT NOT NULL,
    "songLyricsId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startLine" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LyricsSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LyricsSection_songLyricsId_position_idx" ON "LyricsSection"("songLyricsId", "position");

-- AddForeignKey
ALTER TABLE "LyricsSection" ADD CONSTRAINT "LyricsSection_songLyricsId_fkey" FOREIGN KEY ("songLyricsId") REFERENCES "SongLyrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
