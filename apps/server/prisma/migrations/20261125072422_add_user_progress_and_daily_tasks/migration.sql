-- CreateTable
CREATE TABLE "UserStage" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "stageId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'locked',
    "unlockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLevel" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "levelId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'locked',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLearning" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "learningDate" DATE NOT NULL,
    "newWordCount" INTEGER NOT NULL DEFAULT 0,
    "reviewWordCount" INTEGER NOT NULL DEFAULT 0,
    "masteredCount" INTEGER NOT NULL DEFAULT 0,
    "isDailyMinimumCompleted" BOOLEAN NOT NULL DEFAULT false,
    "sessionStatus" TEXT NOT NULL DEFAULT 'in_progress',
    "lastLearningPosition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyLearning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTask" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "learningDate" DATE NOT NULL,
    "wordSenseId" UUID NOT NULL,
    "taskType" TEXT NOT NULL,
    "taskStatus" TEXT NOT NULL DEFAULT 'pending',
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRecord" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "wordSenseId" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "result" TEXT,
    "sequenceNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserStage_userId_idx" ON "UserStage"("userId");

-- CreateIndex
CREATE INDEX "UserStage_stageId_idx" ON "UserStage"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "UserStage_userId_stageId_key" ON "UserStage"("userId", "stageId");

-- CreateIndex
CREATE INDEX "UserLevel_userId_idx" ON "UserLevel"("userId");

-- CreateIndex
CREATE INDEX "UserLevel_levelId_idx" ON "UserLevel"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "UserLevel_userId_levelId_key" ON "UserLevel"("userId", "levelId");

-- CreateIndex
CREATE INDEX "DailyLearning_userId_idx" ON "DailyLearning"("userId");

-- CreateIndex
CREATE INDEX "DailyLearning_learningDate_idx" ON "DailyLearning"("learningDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLearning_userId_learningDate_key" ON "DailyLearning"("userId", "learningDate");

-- CreateIndex
CREATE INDEX "DailyTask_userId_idx" ON "DailyTask"("userId");

-- CreateIndex
CREATE INDEX "DailyTask_learningDate_idx" ON "DailyTask"("learningDate");

-- CreateIndex
CREATE INDEX "DailyTask_wordSenseId_idx" ON "DailyTask"("wordSenseId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTask_userId_learningDate_wordSenseId_taskType_key" ON "DailyTask"("userId", "learningDate", "wordSenseId", "taskType");

-- CreateIndex
CREATE INDEX "ReviewRecord_userId_idx" ON "ReviewRecord"("userId");

-- CreateIndex
CREATE INDEX "ReviewRecord_wordSenseId_idx" ON "ReviewRecord"("wordSenseId");

-- CreateIndex
CREATE INDEX "ReviewRecord_scheduledAt_idx" ON "ReviewRecord"("scheduledAt");

-- AddForeignKey
ALTER TABLE "UserStage" ADD CONSTRAINT "UserStage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStage" ADD CONSTRAINT "UserStage_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLevel" ADD CONSTRAINT "UserLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLevel" ADD CONSTRAINT "UserLevel_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLearning" ADD CONSTRAINT "DailyLearning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_wordSenseId_fkey" FOREIGN KEY ("wordSenseId") REFERENCES "WordSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRecord" ADD CONSTRAINT "ReviewRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRecord" ADD CONSTRAINT "ReviewRecord_wordSenseId_fkey" FOREIGN KEY ("wordSenseId") REFERENCES "WordSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
