-- CreateTable
CREATE TABLE "UserWord" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "wordSenseId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "correctStreak" INTEGER NOT NULL DEFAULT 0,
    "firstLearnedAt" TIMESTAMP(3),
    "lastTestedAt" TIMESTAMP(3),
    "lastCorrectAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "masteredAt" TIMESTAMP(3),
    "forgottenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingRecord" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "wordSenseId" UUID NOT NULL,
    "inputAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "isIndependent" BOOLEAN NOT NULL DEFAULT true,
    "attemptType" TEXT NOT NULL DEFAULT 'scheduled',
    "isValidMasteryAttempt" BOOLEAN NOT NULL DEFAULT true,
    "retryOfRecordId" UUID,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserWord_userId_idx" ON "UserWord"("userId");

-- CreateIndex
CREATE INDEX "UserWord_wordSenseId_idx" ON "UserWord"("wordSenseId");

-- CreateIndex
CREATE INDEX "UserWord_nextReviewAt_idx" ON "UserWord"("nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserWord_userId_wordSenseId_key" ON "UserWord"("userId", "wordSenseId");

-- CreateIndex
CREATE INDEX "WritingRecord_userId_idx" ON "WritingRecord"("userId");

-- CreateIndex
CREATE INDEX "WritingRecord_wordSenseId_idx" ON "WritingRecord"("wordSenseId");

-- CreateIndex
CREATE INDEX "WritingRecord_testedAt_idx" ON "WritingRecord"("testedAt");

-- AddForeignKey
ALTER TABLE "UserWord" ADD CONSTRAINT "UserWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWord" ADD CONSTRAINT "UserWord_wordSenseId_fkey" FOREIGN KEY ("wordSenseId") REFERENCES "WordSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingRecord" ADD CONSTRAINT "WritingRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingRecord" ADD CONSTRAINT "WritingRecord_wordSenseId_fkey" FOREIGN KEY ("wordSenseId") REFERENCES "WordSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingRecord" ADD CONSTRAINT "WritingRecord_retryOfRecordId_fkey" FOREIGN KEY ("retryOfRecordId") REFERENCES "WritingRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
