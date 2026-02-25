-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('CONTEXT', 'MOOD');

-- AlterTable
ALTER TABLE "SavedLyric" ADD COLUMN     "note" TEXT;

-- CreateTable
CREATE TABLE "Lyrics" (
    "id" TEXT NOT NULL,
    "savedLyricId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lyrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LyricsLine" (
    "id" TEXT NOT NULL,
    "lyricsId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "timestampMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LyricsLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LyricsVersion" (
    "id" TEXT NOT NULL,
    "lyricsId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "rawText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LyricsVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineAnnotation" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "emoji" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongTag" (
    "id" TEXT NOT NULL,
    "savedLyricId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "type" "TagType" NOT NULL DEFAULT 'CONTEXT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lyrics_savedLyricId_key" ON "Lyrics"("savedLyricId");

-- CreateIndex
CREATE INDEX "LyricsLine_lyricsId_lineNumber_idx" ON "LyricsLine"("lyricsId", "lineNumber");

-- CreateIndex
CREATE INDEX "LyricsVersion_lyricsId_version_idx" ON "LyricsVersion"("lyricsId", "version");

-- CreateIndex
CREATE INDEX "LineAnnotation_lineId_idx" ON "LineAnnotation"("lineId");

-- CreateIndex
CREATE INDEX "LineAnnotation_userId_idx" ON "LineAnnotation"("userId");

-- CreateIndex
CREATE INDEX "SongTag_tag_idx" ON "SongTag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "SongTag_savedLyricId_tag_key" ON "SongTag"("savedLyricId", "tag");

-- AddForeignKey
ALTER TABLE "Lyrics" ADD CONSTRAINT "Lyrics_savedLyricId_fkey" FOREIGN KEY ("savedLyricId") REFERENCES "SavedLyric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LyricsLine" ADD CONSTRAINT "LyricsLine_lyricsId_fkey" FOREIGN KEY ("lyricsId") REFERENCES "Lyrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LyricsVersion" ADD CONSTRAINT "LyricsVersion_lyricsId_fkey" FOREIGN KEY ("lyricsId") REFERENCES "Lyrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineAnnotation" ADD CONSTRAINT "LineAnnotation_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "LyricsLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineAnnotation" ADD CONSTRAINT "LineAnnotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongTag" ADD CONSTRAINT "SongTag_savedLyricId_fkey" FOREIGN KEY ("savedLyricId") REFERENCES "SavedLyric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
