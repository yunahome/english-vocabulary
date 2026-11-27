-- 保留原始资料的用法说明与原文
ALTER TABLE "WordSense"
ADD COLUMN "usageNotes" TEXT,
ADD COLUMN "sourceText" TEXT;
