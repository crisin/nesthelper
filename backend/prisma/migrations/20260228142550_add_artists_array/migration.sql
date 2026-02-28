-- AlterTable
ALTER TABLE "LibraryTrack" ADD COLUMN     "artists" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "SavedLyric" ADD COLUMN     "artists" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "SearchHistory" ADD COLUMN     "artists" TEXT[] DEFAULT ARRAY[]::TEXT[];
