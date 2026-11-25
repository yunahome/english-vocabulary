-- CreateTable
CREATE TABLE "WordSense" (
    "id" UUID NOT NULL,
    "wordId" TEXT NOT NULL,
    "partOfSpeech" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "englishDefinition" TEXT,
    "example" TEXT,
    "exampleTranslation" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordSense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordForm" (
    "id" UUID NOT NULL,
    "wordId" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "formType" TEXT NOT NULL,

    CONSTRAINT "WordForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WordSense_wordId_idx" ON "WordSense"("wordId");

-- CreateIndex
CREATE INDEX "WordSense_wordId_sortOrder_idx" ON "WordSense"("wordId", "sortOrder");

-- CreateIndex
CREATE INDEX "WordForm_wordId_idx" ON "WordForm"("wordId");

-- CreateIndex
CREATE UNIQUE INDEX "WordForm_wordId_form_formType_key" ON "WordForm"("wordId", "form", "formType");

-- AddForeignKey
ALTER TABLE "WordSense" ADD CONSTRAINT "WordSense_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordForm" ADD CONSTRAINT "WordForm_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
