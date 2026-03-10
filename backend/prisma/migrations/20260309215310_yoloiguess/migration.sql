-- AlterTable
ALTER TABLE "LyricsLine" ADD COLUMN     "songLyricsId" TEXT;

-- AlterTable
ALTER TABLE "LyricsVersion" ADD COLUMN     "songLyricsId" TEXT;

-- AlterTable
ALTER TABLE "SavedLyric" ADD COLUMN     "songId" TEXT;

-- AlterTable
ALTER TABLE "SongTag" ADD COLUMN     "addedBy" TEXT,
ADD COLUMN     "songId" TEXT;

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "spotifyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "artists" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imgUrl" TEXT,
    "spotifyUrl" TEXT,
    "videoUrl" TEXT,
    "fetchStatus" "LyricsFetchStatus" NOT NULL DEFAULT 'IDLE',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongLyrics" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastEditedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SongLyrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Song_spotifyId_key" ON "Song"("spotifyId");

-- CreateIndex
CREATE UNIQUE INDEX "SongLyrics_songId_key" ON "SongLyrics"("songId");

-- AddForeignKey
ALTER TABLE "SongLyrics" ADD CONSTRAINT "SongLyrics_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedLyric" ADD CONSTRAINT "SavedLyric_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE;
