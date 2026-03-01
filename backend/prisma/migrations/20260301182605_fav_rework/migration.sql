/*
  Warnings:

  - A unique constraint covering the columns `[userId,spotifyId]` on the table `SavedLyric` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SavedLyric" ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "spotifyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SavedLyric_userId_spotifyId_key" ON "SavedLyric"("userId", "spotifyId");
