-- AlterTable
ALTER TABLE "Song" ADD COLUMN     "albumName" TEXT,
ADD COLUMN     "albumTotalTracks" INTEGER,
ADD COLUMN     "albumType" TEXT,
ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "explicit" BOOLEAN,
ADD COLUMN     "metadataFetchedAt" TIMESTAMP(3),
ADD COLUMN     "releaseDate" TEXT,
ADD COLUMN     "releaseDatePrecision" TEXT,
ADD COLUMN     "trackNumber" INTEGER;
