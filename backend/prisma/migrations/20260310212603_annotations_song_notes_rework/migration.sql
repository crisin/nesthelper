/*
  Warnings:

  - A unique constraint covering the columns `[userId,lineId]` on the table `LineAnnotation` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "LineAnnotation_userId_idx";

-- CreateTable
CREATE TABLE "SongNote" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SongNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SongNote_songId_idx" ON "SongNote"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "SongNote_userId_songId_key" ON "SongNote"("userId", "songId");

-- CreateIndex
CREATE UNIQUE INDEX "LineAnnotation_userId_lineId_key" ON "LineAnnotation"("userId", "lineId");

-- AddForeignKey
ALTER TABLE "SongNote" ADD CONSTRAINT "SongNote_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongNote" ADD CONSTRAINT "SongNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
