-- DropIndex
DROP INDEX "PlayHistory_spotifyId_idx";

-- CreateIndex
CREATE INDEX "PlayHistory_userId_spotifyId_idx" ON "PlayHistory"("userId", "spotifyId");

-- CreateIndex
CREATE INDEX "SavedLyric_songId_idx" ON "SavedLyric"("songId");

-- CreateIndex
CREATE INDEX "SearchHistory_userId_idx" ON "SearchHistory"("userId");

-- CreateIndex
CREATE INDEX "SongNote_userId_idx" ON "SongNote"("userId");
