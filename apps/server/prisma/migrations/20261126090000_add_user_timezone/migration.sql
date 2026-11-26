-- 用户时区用于按本地自然日生成每日任务和学习连续天数。
ALTER TABLE "User"
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai';
