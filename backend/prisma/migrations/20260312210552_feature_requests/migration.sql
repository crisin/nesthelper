-- CreateEnum
CREATE TYPE "FeatureStatus" AS ENUM ('DRAFT', 'MUST_HAVE', 'WORKING_ON_IT', 'DONE', 'DECLINED');

-- CreateTable
CREATE TABLE "FeatureRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "page" TEXT,
    "status" "FeatureStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureRequestVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "FeatureRequestVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeatureRequest_status_idx" ON "FeatureRequest"("status");

-- CreateIndex
CREATE INDEX "FeatureRequest_createdAt_idx" ON "FeatureRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureRequestVote_userId_requestId_key" ON "FeatureRequestVote"("userId", "requestId");

-- AddForeignKey
ALTER TABLE "FeatureRequest" ADD CONSTRAINT "FeatureRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureRequestVote" ADD CONSTRAINT "FeatureRequestVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureRequestVote" ADD CONSTRAINT "FeatureRequestVote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FeatureRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
