# Database Design

数据库：PostgreSQL 16（Docker 容器 `englis-vocabulary-postgres`），ORM：Prisma 6.19.3。
无 Docker 时可用 PGlite 通过 PostgreSQL 协议暴露 5432 端口，代码无需改动。

## 当前表清单（17 张业务表）

完整定义见 `apps/server/prisma/schema.prisma`，迁移 SQL 见 `apps/server/prisma/migrations/`。

| 分组 | 表 | 说明 |
| --- | --- | --- |
| 旧联调 | `Word` | 单词词条（含 `lemma` / `imageUrl` / `pronunciationUrl`） |
| 旧联调 | `User` | 用户（`openid` 唯一） |
| 旧联调 | `LearningRecord` | 早期熟悉度记录，向后兼容保留 |
| 课程 | `Stage` | 五个学习阶段（Elementary / Junior High / Senior High / CET-4 / IELTS） |
| 课程 | `Unit` | 阶段内课程单元 |
| 课程 | `Level` | 单元内闯关关卡 |
| 词汇 | `WordSense` | 单词的具体词义、词性、例句 |
| 词汇 | `WordForm` | 词形变化 |
| 关联 | `LevelWord` | 关卡 → 词义（`isRequired` / `sortOrder`） |
| 关联 | `StageWord` | 阶段必学词义（`isRequired` / `sortOrder`） |
| 掌握 | `UserWord` | 用户 × 词义的掌握状态（唯一 `userId + wordSenseId`） |
| 掌握 | `WritingRecord` | 每次拼写提交的完整历史 |
| 进度 | `UserStage` | 用户阶段解锁状态 |
| 进度 | `UserLevel` | 用户关卡进度 |
| 每日 | `DailyLearning` | 每日汇总（新词数 / 复习数 / 掌握数 / 最低任务完成标记） |
| 每日 | `DailyTask` | 当日具体任务（唯一 `userId + learningDate + wordSenseId + taskType`） |
| 复习 | `ReviewRecord` | 复习记录 |

## 关键类型约定

- 旧 `Word.id` / `User.id` 为 `text`；新课程体系的主键与外键使用 `@db.Uuid`。
- 因此 `UserWord.userId` / `DailyTask.userId` 为 `text`，而 `wordSenseId` / `stageId` / `levelId` 为 `@db.Uuid`。
- 时间统一由服务端生成，掌握间隔判断以服务器时间为准。

## 种子数据

`pnpm db:seed`（幂等）会写入：

- 5 个 Stage；
- Elementary → Unit 1 → Level 1~16；
- 100 个基础词（`seed.ts` + `lesson-words-extra.ts`）在 Level 1；
- 墨典小学英语 PDF 词表 1532 词（`pdf-words.json`），追加到 Unit 1 的 Level 2~16；
- Elementary 共 1 个 Unit / 16 个 Level / 1448 个必学词义；
- 每个词含音标、中文释义、词性，关联到 `LevelWord` 与 `StageWord`；
- 每个词通过 `LevelWord` 关联到 Level 1、通过 `StageWord` 标记为 Elementary 必学。

图片 `imageUrl` 目前是 emoji 占位（小程序端会映射为从 UI 图裁出的本地素材），`pronunciationUrl` 为空。替换 `apps/server/prisma/seed.ts` 后重跑 seed 即可生效。

## 业务规则位置

三次有效正确、立即重试不计、答错清零、+7 天复习、阶段解锁等规则**不固化在数据库约束里**，由 `LearningService` / `ProgressService` 用代码实现：

- `POST /api/learning/writing`：每次写 `WritingRecord` + upsert `UserWord`；
- `GET /api/progress/daily-tasks`：按当前解锁阶段的 `StageWord` 生成当日新词任务；
- `POST /api/progress/daily-tasks/:id/complete`：同步 `DailyLearning` 计数与最低任务完成标记。
