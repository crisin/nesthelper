-- CreateEnum
CREATE TYPE "LyricsFetchStatus" AS ENUM ('IDLE', 'FETCHING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "SavedLyric" ADD COLUMN     "fetchStatus" "LyricsFetchStatus" NOT NULL DEFAULT 'IDLE';

-- CreateTable
CREATE TABLE "ListeningContext" (
    "id" TEXT NOT NULL,
    "savedLyricId" TEXT NOT NULL,
    "hour" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "deviceType" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListeningContext_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListeningContext_savedLyricId_key" ON "ListeningContext"("savedLyricId");

-- AddForeignKey
ALTER TABLE "ListeningContext" ADD CONSTRAINT "ListeningContext_savedLyricId_fkey" FOREIGN KEY ("savedLyricId") REFERENCES "SavedLyric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
