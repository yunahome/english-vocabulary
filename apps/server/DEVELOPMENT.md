# 后端开发指南（写给前端）

这份文档面向熟悉前端、但没做过 NestJS 后端的人。目标：看完能理解这个项目后端在干什么、代码放在哪、怎么改、怎么查问题。

约定：文中出现的"前端"指 `apps/miniapp`（uni-app 小程序），"后端"指本目录 `apps/server`（NestJS）。

---

## 一、先建立整体心智模型

### 1.1 后端在整个项目里的位置

```
微信小程序（Vue 页面）
   │  HTTPS 请求，Header 带 Authorization: Bearer <token>
   ▼
NestJS 后端（本目录，跑在 localhost:3000，前缀 /api）
   │  Prisma（把 TS 对象翻译成 SQL）
   ▼
PostgreSQL（Docker 容器，localhost:5432）
```

后端只做三件事：**接收 HTTP 请求 → 处理业务逻辑 → 读写数据库 → 返回 JSON**。它不渲染页面，不负责 UI。

### 1.2 NestJS 是什么（用前端类比）

如果你熟悉 React/Vue，NestJS 可以理解成"后端版的框架约定"：

| 前端概念 | 后端对应 | 本项目文件 |
|---|---|---|
| 路由定义（react-router） | **Controller**（装饰器声明路由） | `src/*/*.controller.ts` |
| 页面组件里的业务逻辑 | **Service**（真正的业务代码） | `src/*/*.service.ts` |
| Redux store / 全局 provider | **Module**（把相关代码打包注册） | `src/*/*.module.ts` |
| axios 拦截器（统一加 token、解包响应） | **Guard / Interceptor / Filter** | `src/auth/`、`src/common/` |
| TypeScript interface（编译期类型） | **DTO**（运行期也要校验参数） | `src/*/dto/*.ts` |
| 面向接口的 ORM（如 prisma 客户端） | **PrismaService** | `src/prisma.service.ts` |

NestJS 的核心写法是**装饰器**，例如：

```ts
@Controller('learning')          // 这个 Controller 下的路由都以 /learning 开头
export class LearningController {
  @Post('writing')               // POST /api/learning/writing
  submitWriting(@Body() dto: SubmitWritingDto, @CurrentUserId() userId: string) {
    return this.service.submitWriting(userId, dto)
  }
}
```

前端看到 `@Get('due')` 就知道对应 `GET /api/learning/due`。全局前缀 `api` 在 `src/main.ts` 里设的。

### 1.3 一个请求完整走过哪些文件

以"提交拼写答案"为例，前端调 `POST /api/learning/writing`：

```
1. main.ts          全局配置：前缀 /api、CORS、参数校验、响应包装、异常处理
2. AuthGuard        检查 Authorization header，验 token，取出 userId 挂到 request
3. learning.controller.ts   @Post('writing') 匹配，@Body() 拿到请求体
4. SubmitWritingDto         class-validator 校验字段（wordSenseId 非空、attemptType 只能是两种值）
5. learning.service.ts      submitWriting()：调掌握规则、写库、触发自动解锁
6. mastery-rules.ts         纯函数：判断这次答对算不算有效掌握
7. progress-helpers.ts      掌握后：更新今日统计、自动完成关卡、自动解锁阶段
8. PrismaService            执行 SQL
9. TransformInterceptor     把 service 返回值包成 { code: 0, data, message: 'ok' }
```

**你需要记住的阅读顺序**：想知道某个接口干什么 → 先找 controller 看路由和参数 → 再进 service 看逻辑 → 遇到规则判断看 `mastery-rules.ts` / `progress-rules.ts`。

---

## 二、目录结构逐个文件说明

```
apps/server/
├── src/
│   ├── main.ts                    程序入口：全局前缀、CORS、校验、拦截器、过滤器
│   ├── app.module.ts              根模块：注册所有子模块、配置 .env 查找路径
│   ├── prisma.service.ts          Prisma 客户端封装（唯一访问数据库的入口）
│   ├── prisma.module.ts           把 PrismaService 做成全局可注入
│   │
│   ├── auth/                      登录鉴权
│   │   ├── auth.controller.ts      POST /auth/wechat/login、GET /auth/me
│   │   ├── auth.service.ts         微信 code 换 openid、签发/校验 token
│   │   ├── auth.guard.ts           全局守卫：除 @Public 外都要带 token
│   │   ├── auth.decorators.ts      @Public 和 @CurrentUserId 两个装饰器
│   │   ├── token.ts                JWT 签名与校验（HMAC-SHA256）
│   │   └── dto/wechat-login.dto.ts 登录参数校验
│   │
│   ├── common/                    全局基础设施
│   │   ├── transform.interceptor.ts  成功响应统一包 { code, data, message }
│   │   ├── all-exceptions.filter.ts  异常统一转成 { code, data:null, message }
│   │   └── date-time.ts           时区处理：dateKeyInTimeZone / parseDateKey 等
│   │
│   ├── health/                    GET /health（公开，不带 token 也能调）
│   ├── catalog/                   课程树查询（阶段/单元/关卡/词）
│   ├── learning/                  学习核心：提交拼写、掌握状态、到期复习、标记遗忘
│   │   ├── mastery-rules.ts       ★ 纯函数：掌握判定的唯一入口（3 次正确、7 天间隔）
│   │   └── dto/submit-writing.dto.ts
│   ├── progress/                  进度与每日任务
│   │   ├── progress-rules.ts      ★ 纯函数：按批取词、连续天数判定
│   │   ├── progress-helpers.ts    ★ 共享逻辑：自动完成关卡、自动解锁阶段、今日掌握数
│   │   └── progress.service.ts    阶段/关卡进度、每日任务生成与完成、断点保存
│   ├── home/                      GET /home/summary（首页一次性聚合，减少请求数）
│   └── words/                     GET /words（词库查询；写接口已移除）
│
├── prisma/
│   ├── schema.prisma              ★ 数据库表结构定义（17 张表）
│   ├── migrations/                历次迁移 SQL（版本控制）
│   ├── seed.ts                    初始化：5 个阶段 + 100 基础词
│   ├── import-pdf-words.ts        导入墨典 1532 词
│   ├── import-enrichment.ts       导入完整学习资料
│   ├── import-final-wordlist.ts   全量导入最终 1079 词表（当前在用）
│   └── restructure-to-one-unit.ts 一次性结构迁移脚本（历史）
│
└── *.test.ts（在 src 各目录内）   单元测试，用 node:test，不需要额外测试框架
```

### 标 ★ 的四个文件最重要

| 文件 | 为什么重要 |
|---|---|
| `mastery-rules.ts` | 所有"这个词算不算掌握"的判断都在这，改掌握规则只改这里 |
| `progress-rules.ts` | 每日任务按批生成、连续天数口径 |
| `progress-helpers.ts` | 掌握一个词之后触发的连锁反应（完成关卡、解锁阶段、更新统计） |
| `schema.prisma` | 数据结构真相之源，改表从这里开始 |

---

## 三、数据库：17 张表怎么理解

`prisma/schema.prisma` 是表结构的唯一定义。Prisma 根据它生成 TypeScript 客户端，所以**改表不能只改数据库，要先改 schema**。

### 3.1 表按用途分五组

| 分组 | 表 | 作用 |
|---|---|---|
| 用户 | `User` | 微信 openid、昵称、时区 |
| 课程 | `Stage`、`Unit`、`Level` | 学段（小学/初中…）→ 单元 → 关卡 |
| 词 | `Word`、`WordSense`、`WordForm` | 单词、词义（一个词可多义）、词形变化 |
| 课程-词关联 | `LevelWord`、`StageWord` | 哪个关/阶段包含哪些词义，`sortOrder` 决定顺序 |
| 用户学习 | `UserWord`、`WritingRecord`、`UserStage`、`UserLevel` | 每个词的掌握状态、每次答题历史、阶段/关卡完成状态 |
| 每日 | `DailyLearning`、`DailyTask`、`ReviewRecord` | 当日汇总、当日任务列表、复习记录 |
| 早期联调（保留） | `LearningRecord` | 老版本遗留，主流程已不用 |

### 3.2 几个关键概念

- **Word vs WordSense**：`Word` 是拼写（如 `lion`），`WordSense` 是词义（如"狮子"）。同名不同义是两个 WordSense。前端学习、答题、任务全部围绕 **WordSense ID**，不是 Word ID。
- **StageWord vs LevelWord**：前者标记"这个词义属于小学必学"，后者标记"这个词义在第 3 关"。阶段解锁看 StageWord，关卡完成看 LevelWord。
- **`isRequired`**：StageWord 上的布尔字段。首页进度和阶段解锁只统计 `isRequired=true` 的词，避免非必学词卡住解锁。
- **状态字段都是字符串**（`UserWord.status`、`UserStage.status` 等），不是数据库枚举。取值约定在代码里：
  - `UserWord.status`: `not_started` / `learning` / `mastered`
  - `UserStage.status`: `locked` / `unlocked` / `completed`
  - `DailyTask.taskStatus`: `pending` / `completed`
- **`lastLearningPosition`**（DailyLearning 上）：学习断点的 JSON 快照，前端保存/恢复都靠它。

### 3.3 当前数据规模（2026-11）

```
Word 1079 / WordSense 1079 / StageWord 1079 / LevelWord 1079
Stage 5 / Unit 1 / Level 11（每关 100 词，最后一关 79 词）
```

---

## 四、接口清单

完整版和 cURL 示例见 `../../docs/API-Specification.md`。这里按"要不要登录"分组：

### 4.1 公开接口（无需 token）

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/health` | 健康检查，数据库挂了也能返回 ok |
| POST | `/api/auth/wechat/login` | 微信登录，body 带 `code` 和可选 `timezone` |

### 4.2 需要 token 的接口

请求头必须带 `Authorization: Bearer <token>`，否则 401。

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/auth/me` | 当前登录用户 |
| GET | `/api/catalog/stages` | 课程树（阶段→单元→关卡） |
| GET | `/api/catalog/levels/:levelId/words` | 某关的词 |
| GET | `/api/catalog/stages/:stageId/words` | 某阶段的必学词 |
| GET | `/api/catalog/words` | 全量词库（前端缓存 24h） |
| GET | `/api/words` | 词库查询（同上，保留接口） |
| POST | `/api/learning/writing` | 提交拼写答案，核心接口 |
| GET | `/api/learning/words` | 当前用户的全部词状态 |
| GET | `/api/learning/due` | 到期复习队列 |
| PUT | `/api/learning/words/:wordSenseId/forgot` | 标记遗忘 |
| POST | `/api/progress/stages/init` | 初始化用户阶段状态（登录时自动调） |
| GET | `/api/progress/stages` | 用户的阶段状态 |
| POST | `/api/progress/stages/:stageId/unlock-next` | 手动解锁（一般不用，已自动化） |
| GET | `/api/progress/levels` | 用户的关卡状态 |
| POST | `/api/progress/levels/:levelId/complete` | 手动完成关卡（一般不用，已自动化） |
| GET | `/api/progress/daily-tasks` | 当日任务 + 学习汇总 |
| PUT | `/api/progress/daily-tasks/session` | 保存/清空断点 |
| POST | `/api/progress/daily-tasks/:taskId/complete` | 完成某个每日任务 |
| GET | `/api/home/summary` | 首页聚合数据 |

### 4.3 响应格式

所有接口统一返回：

```ts
{ code: 0, data: <业务数据>, message: 'ok' }
```

成功由 `TransformInterceptor` 自动包装，失败由 `AllExceptionsFilter` 包装成 `{ code: <HTTP状态码>, data: null, message }`。前端 `src/api/request.ts` 负责拆包。

---

## 五、鉴权流程（前端最需要理解的部分）

```
小程序 wx.login() 拿到 code
   → POST /api/auth/wechat/login { code, timezone }
   → 后端用 code 调微信 code2Session 换 openid
   → 按 openid 找到/创建 User
   → 签发 token：base64url(header).base64url(payload).HMAC签名
      payload = { sub: userId, iat: 签发秒, exp: 过期秒 }
   → 返回 token，前端存本地 storage
   → 之后每个请求带 Authorization: Bearer <token>
   → AuthGuard 验签 + 查 exp，从 token 解出 userId 挂到 request.user
   → Controller 用 @CurrentUserId() 取到 userId
```

**关键点：业务接口从不从参数里接收 userId**，全部从 token 注入。这是为了防止越权（前端传别人的 userId 就能操作别人的数据）。

前端 `userStore.ensureUser()` 负责这套流程，并发调用会用 in-flight Promise 合并，不会重复登录。token 过期（401）后 request 层清 token，`ensureUser()` 下次会重新登录。

---

## 六、核心业务规则

### 6.1 掌握判定（`src/learning/mastery-rules.ts`）

| 规则 | 实现 |
|---|---|
| 连续 3 次有效正确才 `mastered` | `MASTERY_STREAK = 3` |
| 相邻两次有效正确至少间隔 7 天 | `REVIEW_INTERVAL_DAYS = 7` |
| 答错 → `correctStreak` 清零 | `evaluateWritingAttempt` 的 `!isCorrect` 分支 |
| 立即重试（`attemptType=immediate_retry`）不计入有效次数 | 提交时 `isValidMasteryAttempt=false` |
| 标记遗忘 → 状态回退 learning、streak 清零、`lastCorrectAt=null` | `markForgotten()` |
| 每次正确后 `nextReviewAt = now + 7天` | `evaluateWritingAttempt` |

这些是**纯函数**（输入快照 → 输出新状态），没有副作用，所以单测很容易写。改规则时优先改这里，不要散落在 service 里。

### 6.2 每日任务（`src/progress/progress.service.ts` + `progress-rules.ts`）

- 按**当前用户第一个未完成的阶段**生成任务（`findActiveStage()` 只取 `unlocked` 且有必学词的阶段，跳过空壳和 locked 阶段）。
- 新词任务 **10 个一批**（`NEW_WORD_BATCH_SIZE`）。只有当上一批全部完成时才生成下一批，避免一次写 1000+ 行。
- 当前阶段新词全部学完 → 进入**补掌握模式**：不再生成新词任务，只安排未掌握词的复习。**绝不从其它阶段补词**。
- 到期复习任务每天生成前会清理历史未完成的，避免堆积。
- 连续天数（streak）只统计真正完成过新词/复习/掌握的日子，只拉任务不算。

### 6.3 自动解锁（`(src/progress/progress-helpers.ts)`）

前端**不需要**调解锁接口，全部自动：

```
submitWriting 掌握一个词
   → completeLevelsForSense()：找出该词所属关卡，若该关所有词都 mastered → 标 completed，解锁下一关
   → autoUnlockStageIfReady()：若当前阶段所有必学词都 mastered
        → 当前阶段标 completed，下一阶段标 unlocked
   → incrementTodayMastered()：按用户时区把当天 masteredCount +1
```

三个函数都是**幂等**的，重复调用不会重复写。`completeDailyTask` 里也有兜底调用。

### 6.4 今日统计的两个口径

| 字段 | 含义 | 维护位置 |
|---|---|---|
| `todayNewWords` | 今日新学数（完成 new 任务数） | `completeDailyTask` 重算 |
| `todayReviews` | 今日复习数 | 同上 |
| `todayMastered` | 今日真正掌握数 | **只在** `incrementTodayMastered` 按用户时区递增，不在 completeDailyTask 重算（UTC/用户时区日边界不一致会算错） |
| `masteredCount`（全局） | 历史累计掌握数 | UserWord 表按 `status=mastered` 统计 |
| `currentStage.learnedWords` | 当前阶段已学习词数（含 learning） | home.service 按 UserWord 有记录统计 |

---

## 七、日常开发操作

### 7.1 启动

在最外层仓库目录：

```bash
pnpm dev          # 同时起后端 watch + 小程序 watch（推荐）
```

只起后端：

```bash
cd apps/server
pnpm dev          # nest start --watch，改 .ts 自动重启
```

启动成功的标志：`NestJS server ready: http://localhost:3000/api`

验证：`curl http://localhost:3000/api/health` 应返回 `{"code":0,"data":{"status":"ok",...},"message":"ok"}`。

### 7.2 测试

```bash
# 在仓库根目录
pnpm typecheck                                   # 前后端类型检查
pnpm --filter @englis-vocabulary/server test     # 后端单测（20 项）
pnpm test:e2e                                    # 端到端测试（49 项，需后端在跑）

# 或在 apps/server 目录
pnpm typecheck
pnpm test
```

E2E 脚本在 `../../scripts/e2e-test.py`，它会创建测试用户、调真实 HTTP 接口、最后清理数据。改完业务逻辑后跑一遍，比单测更能发现集成问题。

### 7.3 改数据库表

**流程固定，别跳步**：

1. 改 `prisma/schema.prisma`
2. `pnpm db:generate`（重新生成 TS 客户端，否则代码里新字段没有类型）
3. `pnpm db:migrate`（生成迁移 SQL 并应用到本地库）
4. 提交时把 `prisma/migrations/` 下新生成的目录一起提交

示例：给 WordSense 加字段：

```prisma
model WordSense {
  // ...已有字段
  newField String?   // 新增
}
```

### 7.4 加一个新接口

以"获取用户收藏的词"为例：

1. `src/catalog/dto/create-xxx.dto.ts`（如需参数校验）— 用 `class-validator` 装饰器声明
2. `src/catalog/catalog.service.ts` 加方法：
   ```ts
   async getFavoriteWords(userId: string) {
     return this.prisma.userWord.findMany({ where: { userId, status: 'mastered' } })
   }
   ```
3. `src/catalog/catalog.controller.ts` 加路由：
   ```ts
   @Get('favorites')
   favorites(@CurrentUserId() userId: string) {
     return this.service.getFavoriteWords(userId)
   }
   ```
4. 如果用到了新的 Prisma 方法类型，跑 `pnpm typecheck`
5. 在 `../../docs/API-Specification.md` 补接口说明
6. 跑单测 + E2E

注意：新接口默认需要登录（AuthGuard 全局生效）。如果确实要公开，在方法或类上加 `@Public()`。

### 7.5 环境变量

配置从仓库根目录 `.env` 读取（`app.module.ts` 的 `findEnvFiles()` 会从进程目录逐级向上找），关键变量：

| 变量 | 作用 | 示例 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql://postgres:***@localhost:5432/englis_vocabulary?...` |
| `AUTH_TOKEN_SECRET` | token 签名密钥 | 高强度随机串 |
| `WECHAT_APP_SECRET` | 微信登录凭证 | 小程序后台获取 |
| `API_PREFIX` | 全局路由前缀，默认 `api` | `api` |
| `PORT` | 端口，默认 3000 | `3000` |
| `CORS_ORIGIN` | 允许的来源 | `true` 表示全部允许 |

**坑**：如果从错误目录启动且找不到 `.env`，`AUTH_TOKEN_SECRET` 会回退到开发默认值，表现为"所有登录接口都 401 但日志没报错"。`findEnvFiles()` 就是为解决这个问题加的。

---

## 八、常见坑与排查

### 8.1 所有接口都 401

按这个顺序查：

1. 前端请求头有没有 `Authorization: Bearer <token>`
2. token 过期没（`src/auth/token.ts` 的 `exp` 检查）
3. 后端读到的 `AUTH_TOKEN_SECRET` 和签发时是不是同一个——用 `console.log` 在 `auth.service.ts` 临时打印（别打印值，打印是否有值）
4. 是不是从奇怪的目录启动导致 `.env` 没找到

### 8.2 数据库连接失败

`AllExceptionsFilter` 会返回 `code=503` 和"数据库连接失败"提示。排查：

1. Docker 容器在不在：`~/.docker/bin/docker ps`（CLI 在 `~/.docker/bin`，新开终端才在 PATH）
2. 端口：`lsof -nP -iTCP:5432 -sTCP:LISTEN`
3. `.env` 的 `DATABASE_URL` 指向对不对

### 8.3 `pnpm dev` 后端起不来

`nest start --watch` 原本会清空 `dist`（82 个文件），在受限环境会被安全策略拦截。`apps/server/nest-cli.json` 里 `deleteOutDir: false` 已修掉此问题。需要彻底清理时手动删 `dist` 再 `pnpm build`。

### 8.4 端口 3000 被占

`EADDRINUSE port 3000` = 已有后端在跑。不要重复启动，直接用即可。要关掉：`lsof -nP -iTCP:3000 -sTCP:LISTEN | tail -n +2 | awk '{print $2}' | xargs kill`。

### 8.5 改完代码前端没反应

- 后端改 `.ts`：watch 模式会自动重启，看日志确认
- 前端改 `.vue`：需要重新编译，开发者工具里点编译或用 `pnpm dev` 的 watch
- 改了 `packages/shared` 的类型：要重新 `pnpm typecheck` 并重启后端

---

## 九、部署相关（当前未做，供参考）

现在后端跑在你本机，数据库在 Docker。真要上线：

| 组件 | 方案 A（托管，推荐） | 方案 B（自建） |
|---|---|---|
| 数据库 | 腾讯云 PostgreSQL，不用 Docker | 云服务器上装 PostgreSQL 或用 Docker |
| 后端 | 云服务器跑 `node dist/main.js`，或做成容器 | 同上 |
| 小程序前端 | 上传到微信平台审核发布 | — |
| 音频 | 腾讯云 COS + CDN | 自建文件服务（不推荐） |

无论哪种，上线前必须：

1. 换掉所有开发密钥（`AUTH_TOKEN_SECRET`、`WECHAT_APP_SECRET`）
2. `.env` 不进 Git（已被 gitignore）
3. 小程序后台配置 request 合法域名（后端域名 + COS 域名）
4. 用 `pnpm db:deploy` 应用迁移，不要在开发库上 `migrate dev`

---

## 十、给前端的阅读建议

如果想快速上手，按这个顺序读：

1. `src/main.ts`（10 分钟）— 知道全局配了什么
2. `src/learning/learning.controller.ts` → `learning.service.ts`（30 分钟）— 最核心的业务
3. `src/learning/mastery-rules.ts`（15 分钟）— 掌握规则，纯函数很好读
4. `prisma/schema.prisma`（20 分钟）— 数据结构
5. `src/progress/progress.service.ts`（30 分钟）— 每日任务
6. 其余按需查

不要一上来就读 `auth/` 和 `common/`——它们是基础设施，理解了主流程再看更省力。

有问题直接对照 `../../docs/API-Specification.md` 和 `../../prd.md`。
