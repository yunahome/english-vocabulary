# API Specification

Base URL：`http://localhost:3000/api`

统一响应：

```json
{ "code": 0, "data": {}, "message": "ok" }
```

错误响应同样使用统一结构，`code` 为 HTTP 状态码，`data` 为 `null`：

```json
{ "code": 503, "data": null, "message": "数据库连接失败，请确认 PostgreSQL 已启动且 DATABASE_URL 正确" }
```

## GET /api/health

健康检查，不依赖数据库。

```bash
curl http://localhost:3000/api/health
```

## GET /api/words

获取单词列表。

```bash
curl http://localhost:3000/api/words
```

## POST /api/words

新增单词。

```bash
curl -X POST http://localhost:3000/api/words \
  -H 'Content-Type: application/json' \
  -d '{"word":"persist","meaning":"坚持；持续","phonetic":"/pərˈsɪst/","example":"Keep practicing and persist."}'
```

## 用户

### POST /api/users
创建用户。带 `openid` 时按 openid 幂等（已存在直接返回），不带则每次新建（开发测试用）。

```bash
curl -X POST http://localhost:3000/api/users \
  -H 'Content-Type: application/json' \
  -d '{"openid":"dev-test-001","nickname":"测试用户"}'
```

### GET /api/users
用户列表。

## 课程与词汇（catalog）

### GET /api/catalog/stages
课程树：Stage → Unit → Level（5 个阶段，按 sortOrder 排序）。

### GET /api/catalog/words
全部单词，每词带 `senses` 词义数组，以及 `imageUrl`（图片占位）、`pronunciationUrl`。

### GET /api/catalog/levels/:levelId/words
某关卡的学习项列表（按学习顺序）。每项 = 词义（definition / partOfSpeech / englishDefinition / example / exampleTranslation）+ 所属单词信息（word / phonetic / imageUrl / pronunciationUrl），可直接驱动 UI 图里的 New Word 和 Writing 页面。

### GET /api/catalog/stages/:stageId/words
某阶段的必学词义（isRequired=true）。

## 学习提交（learning）—— 核心业务规则

### POST /api/learning/writing
提交一次拼写测试。后端根据历史判断是否为有效掌握尝试：

- 每次测试都写入 `WritingRecord`，保留完整历史。
- **只有「独立作答 且 attemptType=scheduled」才计入有效掌握次数**；`immediate_retry`（立即重试）不计。
- 有效且正确 → `correctStreak + 1`；连续 **3 次**有效正确 → 标记 `mastered`。
- 每次正确后 `nextReviewAt` = 现在 + **7 天**。
- 答错 → `correctStreak` 归零，已掌握退回 learning。

```bash
curl -X POST http://localhost:3000/api/learning/writing \
  -H 'Content-Type: application/json' \
  -d '{"userId":"<用户ID>","wordSenseId":"<词义ID>","inputAnswer":"vocabulary","isCorrect":true,"attemptType":"scheduled"}'
```

返回示例：
```json
{"code":0,"data":{"recordId":"...","isValidMasteryAttempt":true,"correctStreak":1,"status":"learning","mastered":false,"nextReviewAt":"2026-12-02T...","reason":"有效正确，连续 1/3 次"},"message":"ok"}
```

### GET /api/learning/words?userId=xxx
某用户的全部掌握状态（UserWord 列表）。

### GET /api/learning/due?userId=xxx
到期复习列表（`nextReviewAt <= 现在`，或标记遗忘的）。

### PUT /api/learning/words/:wordSenseId/forgot?userId=xxx
主动标记遗忘：状态回退 learning、streak 清零、masteredAt 清空，但保留 WritingRecord 历史。

## 用户进度与每日任务（progress）

### POST /api/progress/stages/init?userId=xxx
初始化阶段进度：首个阶段 unlocked，其余 locked（幂等）。

### GET /api/progress/stages?userId=xxx
阶段进度列表。

### POST /api/progress/stages/:stageId/unlock-next?userId=xxx
解锁下一阶段。

### GET /api/progress/levels?userId=xxx
关卡进度列表。

### POST /api/progress/levels/:levelId/complete?userId=xxx
标记关卡完成，并解锁同一 Unit 的下一关。

### GET /api/progress/daily-tasks?userId=xxx&date=YYYY-MM-DD
获取/生成当日任务。已有则直接返回；没有则按**当前解锁阶段的必学词义（`StageWord`，`isRequired=true`）**生成最低 5 个新词任务（数据不足时按实际数量），不再取全局 `WordSense` 前 5 个，避免旧示例词混入当日任务。date 省略为今天。

### POST /api/progress/daily-tasks/:taskId/complete?userId=xxx&date=YYYY-MM-DD
完成任务，并同步 DailyLearning 的计数与最低任务完成标记。

## 首页聚合

### GET /api/home/summary?userId=xxx

一次请求返回首页全部数据，避免多次往返：

- `greeting` / `subtitle`：按服务器时间生成问候语；
- `dayStreak`：从 `DailyLearning` 连续天数计算（今天没学从昨天算）；
- `masteredCount`：已掌握词义数；
- `currentStage`：当前阶段名、`Stage x of y`、已掌握/必学词数、进度百分比；
- `reviewDueCount`：到期复习数；
- `newWordsLocked`：`reviewDueCount > 0` 时为 true（复习优先规则）；
- `newWordsMinimum`：每日最低新词数（5）；
- `date`：服务器日期。

```bash
curl "http://localhost:3000/api/home/summary?userId=<用户ID>"
```

## 小程序端数据组装说明

`/api/learning/due` 与 `/api/learning/words` 只返回 `wordSenseId`。小程序端通过 `GET /api/catalog/words` 把词义 ID 反查成可展示的单词、释义与图片；新词学习则用 `GET /api/catalog/stages` 找到首个 Level，再调 `/api/catalog/levels/:id/words` 取完整学习项（词义 + 单词音标/图片/发音）。

## 说明

- 当前 `userId` 由接口参数传入（开发阶段）。接入微信登录后由网关/鉴权层注入，业务接口无需改动。
- 业务规则（三次正确、7 天间隔、阶段解锁）在 `LearningService` / `ProgressService` 中用代码实现，不固化在数据库约束里。

## Postman

可直接复制上面的 cURL 到 Postman：File → Import → Paste Raw Text。
建议建立环境变量 `baseUrl = http://localhost:3000/api`，再按需添加各接口请求。
