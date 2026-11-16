-- CreateTable
CREATE TABLE "LyricsTake" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'vizzy',
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "clock" TEXT NOT NULL,
    "durationMs" INTEGER,
    "heardMs" INTEGER NOT NULL,
    "fromMs" INTEGER NOT NULL,
    "toMs" INTEGER NOT NULL,
    "engine" JSONB,
    "lines" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LyricsTake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LyricsTake_userId_songId_recordedAt_key" ON "LyricsTake"("userId", "songId", "recordedAt");

-- CreateIndex
CREATE INDEX "LyricsTake_songId_idx" ON "LyricsTake"("songId");

-- AddForeignKey
ALTER TABLE "LyricsTake" ADD CONSTRAINT "LyricsTake_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LyricsTake" ADD CONSTRAINT "LyricsTake_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
