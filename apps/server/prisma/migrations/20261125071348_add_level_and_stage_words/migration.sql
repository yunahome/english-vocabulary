-- CreateTable
CREATE TABLE "LevelWord" (
    "id" UUID NOT NULL,
    "levelId" UUID NOT NULL,
    "wordSenseId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LevelWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageWord" (
    "id" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "wordSenseId" UUID NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageWord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LevelWord_levelId_idx" ON "LevelWord"("levelId");

-- CreateIndex
CREATE INDEX "LevelWord_wordSenseId_idx" ON "LevelWord"("wordSenseId");

-- CreateIndex
CREATE UNIQUE INDEX "LevelWord_levelId_wordSenseId_key" ON "LevelWord"("levelId", "wordSenseId");

-- CreateIndex
CREATE INDEX "StageWord_stageId_idx" ON "StageWord"("stageId");

-- CreateIndex
CREATE INDEX "StageWord_wordSenseId_idx" ON "StageWord"("wordSenseId");

-- CreateIndex
CREATE UNIQUE INDEX "StageWord_stageId_wordSenseId_key" ON "StageWord"("stageId", "wordSenseId");

-- AddForeignKey
ALTER TABLE "LevelWord" ADD CONSTRAINT "LevelWord_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelWord" ADD CONSTRAINT "LevelWord_wordSenseId_fkey" FOREIGN KEY ("wordSenseId") REFERENCES "WordSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageWord" ADD CONSTRAINT "StageWord_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageWord" ADD CONSTRAINT "StageWord_wordSenseId_fkey" FOREIGN KEY ("wordSenseId") REFERENCES "WordSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
