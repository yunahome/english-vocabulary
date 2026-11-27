# english-vocabulary

背单词微信小程序：uni-app（Vue 3）+ NestJS + PostgreSQL，前后端独立运行、同一 Git 仓库管理。

> 本地目录：`/Users/yktc/Documents/english-vocabulary`
> Git 远程：`https://github.com/yunahome/english-vocabulary.git`（`main` 分支）

## 当前状态

**工程骨架 + 核心学习闭环 MVP + 微信鉴权 + 学习断点恢复 + 最终词表，均已落地。**

- 数据库 17 张业务表；前端 4 个 Tab + 4 个学习流程页；后端 REST 接口与业务规则全部打通。
- PRD 第 14 章 MVP 17 项**全部实现**；补掌握模式已有独立入口。
- **课程词库 1079 个必学词义**，来自「小学英语词汇图解+联想记忆法」基准词表，经过六项清洗（词性英文化、音标统一、列改名、例句翻译归位、英文释义补齐、中文释义去重）并按基准词表过滤。Elementary 阶段 1 个 Unit / 11 个 Level，每关 100 词。
- 严格阶段解锁、7 天间隔强校验、每 10 词弹窗、每日新词按批生成、今日已通过词不重复学、断点恢复、批次内乱序均已实现并有测试覆盖。
- 验证：**单测 18/18、E2E 49/49**，typecheck 与 build 通过。

后续（未接入）：发音音频与腾讯云 COS、学习提醒、云端部署。

完整产品需求见根目录 `prd.md`（V1.2），UI 设计稿对应 `docs/UI-Specification.md`。

## 技术栈与版本

| 层级 | 选型 | 版本 |
| --- | --- | --- |
| 小程序框架 | uni-app（目标平台：微信小程序） | 3.0.0-5030420261029002 |
| 前端框架 | Vue | 3.4.21 |
| 开发语言 | TypeScript | 小程序 4.9.5 / 后端 5.4.5 |
| 构建工具 | Vite | 5.2.8 |
| 状态管理 | Pinia | 2.1.7 |
| 运行环境 | Node.js | 本机 v24.22.1，`.nvmrc` 锁定 22 |
| 包管理 | pnpm（corepack） | 12.23.0 |
| 后端框架 | NestJS | 11.2.11 |
| ORM | Prisma | 6.19.3 |
| 数据库 | PostgreSQL（Docker 容器） | 16-alpine |
| 无 Docker 备选 | PGlite（WASM PostgreSQL） | 0.6.0 |
| API 风格 | REST | 统一 `{ code, data, message }` |

## 目录结构

```
english-vocabulary/
├── apps/
│   ├── miniapp/                      # uni-app Vue3 微信小程序
│   │   ├── src/
│   │   │   ├── api/                  # request 封装 + catalog/learning/progress/home/auth
│   │   │   ├── stores/               # user（身份）/ word / learning（学习会话）
│   │   │   ├── utils/                # nav / auth-storage / learning-session / catalog-cache
│   │   │   ├── pages/
│   │   │   │   ├── home/             # Tab：首页
│   │   │   │   ├── vocabulary/       # Tab：词库（筛选/搜索/详情/标记遗忘）
│   │   │   │   ├── progress/         # Tab：阶段进度
│   │   │   │   ├── profile/          # Tab：个人资料与统计
│   │   │   │   ├── review/           # 流程页：复习拼写
│   │   │   │   ├── word-learning/    # 流程页：新词学习
│   │   │   │   ├── writing/          # 流程页：拼写测试
│   │   │   │   ├── daily-result/     # 流程页：每日总结
│   │   │   │   └── index/            # 早期联调页（保留）
│   │   │   ├── static/assets/        # 从 UI 设计稿裁出的插画与图标
│   │   │   ├── pages.json            # 页面路由 + 原生 tabBar
│   │   │   └── manifest.json         # 微信 AppID 等原生配置
│   │   └── dist/                     # 编译产物（gitignore）
│   │       ├── dev/mp-weixin/        # pnpm dev 输出，带热更新
│   │       └── build/mp-weixin/      # pnpm build 输出，生产用
│   └── server/                       # NestJS 后端
│       ├── prisma/
│       │   ├── schema.prisma         # 17 张业务表
│       │   ├── migrations/           # 迁移 SQL
│       │   ├── seed.ts               # 5 阶段 + 100 基础词（幂等）
│       │   ├── lesson-words-extra.ts # 扩展词表 80 个
│       │   ├── pdf-words.json        # 墨典小学英语 1532 词（清洗后）
│       │   ├── import-pdf-words.ts   # PDF 词表导入（幂等）
│       │   ├── import-enrichment.ts  # 完整学习资料导入（幂等）
│       │   └── import-final-wordlist.ts # 最终 1079 词表全量导入
│       └── src/
│           ├── main.ts               # 全局前缀、CORS、校验、拦截器、过滤器
│           ├── app.module.ts         # 向上查找 .env（findEnvFiles）
│           ├── auth/                 # 微信登录与会话 Token
│           ├── catalog/ learning/ progress/ home/ words/
│           ├── common/ health/       # 统一响应、异常过滤、健康检查
│           └── progress-rules.ts / progress-helpers.ts  # 规则与共享判定
├── packages/shared/src/index.ts      # 前后端共享 TypeScript 类型
├── data/
│   ├── enrichment/                   # 墨典 1532 词完整资料（Excel + JSON）
│   └── integration/                  # 两份资料整合清洗 → 最终 1079 词表
├── scripts/
│   ├── e2e-test.py                   # 端到端测试（49 项）
│   ├── import-pdf-words.py           # PDF 提取文本 → 清洗 JSON
│   ├── clean-integration.py          # 整合表六项清洗
│   └── check-enrichment.py           # 资料质量检查
├── database/                         # docker-compose.yml / PGlite 本地库
├── docs/                             # PRD / UI / 数据库 / API 设计文档
├── prd.md                            # 产品需求文档 V1.2（用户提供）
└── package.json                      # 根目录统一脚本
```

## 已实现功能

### 数据库（17 张业务表）

课程（Stage / Unit / Level）、词汇（Word / WordSense / WordForm）、关联（LevelWord / StageWord）、用户掌握（UserWord / WritingRecord）、进度与每日任务（UserStage / UserLevel / DailyLearning / DailyTask / ReviewRecord）、用户与鉴权。

`WordSense` 除音标、词性、中英文释义、例句与翻译、记忆技巧外，还保留 `usageNotes`（用法说明）与 `sourceText`（原始资料文本）。

### 后端接口

完整清单见 `docs/API-Specification.md`。核心分组：

- `GET /api/health`：健康检查（公开）
- `POST /api/auth/wechat/login`、`GET /api/auth/me`：微信登录与当前用户
- `/api/catalog/*`：课程树、单词带词义、关卡/阶段词义（需登录）
- `/api/learning/*`：提交拼写、掌握状态、到期复习、标记遗忘
- `/api/progress/*`：阶段/关卡进度、每日任务生成与完成、断点保存
- `GET /api/home/summary`：首页一次性聚合数据
- `GET /api/words`：词库查询（需登录；运行时写词接口已移除，课程词由脚本管理）

统一响应结构、DTO 校验、全局异常处理、CORS。`/api/users` 模块已移除（存在伪造用户风险）。

### 业务规则

- 每次测试写入 `WritingRecord` 保留完整历史；只有「独立作答 + `scheduled`」计入有效掌握，`immediate_retry` 不计。
- 连续 3 次**有效**正确才算 mastered，相邻有效正确间隔至少 7 天；答错 streak 清零，标记遗忘回退状态。
- 阶段解锁严格校验：当前阶段全部必学词义 mastered 才自动解锁下一阶段（`submitWriting` 触发，幂等）。
- 每日新词任务按当前阶段 `StageWord` 生成，**10 词/批**，不从其它阶段补词；本阶段学完进入补掌握模式（只安排未掌握词复习）。
- 连续天数只统计真正完成过新词/复习/掌握的日子。
- 今日已通过的词不会重复进入学习队列。

### 小程序页面

| 页面 | 类型 | 内容 |
| --- | --- | --- |
| Home | Tab | 问候语、吉祥物 banner、连续天数/掌握数、Current Stage 进度、今日任务、主按钮 |
| Vocabulary | Tab | 全量词库列表（1079 词）、筛选/搜索/详情/标记遗忘 |
| Progress | Tab | 当前阶段概览、学习统计、五阶段解锁路径 |
| Profile | Tab | 用户卡、学习统计、今日概览 |
| Review | 流程页 | 复习进度、拼写、答错 Try Again、补学模式提示 |
| New Word | 流程页 | 大图、单词/音标、词性、MEANING / Example / Remember 卡 |
| Writing | 流程页 | 中文提示、拼写输入、Submit、10 词询问弹窗 |
| Daily Result | 流程页 | 庆祝插画、今日统计、阶段进度、明日预估 |

`stores/learning.ts` 把 Review → New Word → Writing → Daily Result 串成一次学习会话，并负责提交拼写、完成每日任务、统计汇总与断点持久化。

**首页两个统计口径**：

- **Words Mastered**：只算真正掌握（`status=mastered`，7 天 × 3 次严格口径）。
- **Current Stage `x / 1079 learned`**：算所有已学习词（UserWord 有记录即算，含 learning）。
- **Today's Tasks / 主按钮**：显示今日新学与复习数量。

**词表顺序 vs 学习乱序**：数据库按 Excel 行序存 `WordSense.sortOrder`（1–1079），课程与每日任务按该顺序取词；前端 `buildItemsByIds()` 仅对当前批次内做 Fisher-Yates 洗牌，不改变数据库顺序，断点恢复按已存队列原样还原。

**TabBar**：微信原生 tabBar，图标由 `apps/miniapp/scripts/gen-tab-icons.mjs` 生成。**UI 素材**：`static/assets/` 下图片从 UI 设计稿裁出；发音 `pronunciationUrl` 为空，点扬声器提示「发音素材待接入」。

### 共享类型

课程、词汇、用户、学习提交、进度与每日任务、首页聚合的 DTO 定义在 `packages/shared/src/index.ts`。

## 环境要求

- Node.js >= 20（本机 v24.22.1，`.nvmrc` 为 22）
- pnpm 12（通过 corepack 启用）
- Docker Desktop：运行 PostgreSQL 容器（本机已安装并保持运行）
- 微信开发者工具：预览小程序

不需要单独安装 `psql` 或原生 PostgreSQL。

**本机 pnpm 说明**：系统有 corepack 但默认无 `pnpm` 命令，已在 `~/.local/bin/pnpm` 生成 shim，并在 `~/.zprofile` 追加 `export PATH="$PATH:/Users/yktc/.local/bin"`。**新开终端窗口**才生效；旧终端可执行 `source ~/.zprofile`。Docker CLI 同理（`~/.docker/bin`）。

## 快速开始（Docker，推荐）

```bash
cd /Users/yktc/Documents/english-vocabulary

# 1. 安装依赖并生成 Prisma Client（首次）
pnpm setup

# 2. 准备环境变量（首次）
cp .env.example .env

# 3. 启动 PostgreSQL 容器（postgres:16-alpine，端口 5432）
pnpm db:up

# 4. 建表 + 迁移
pnpm db:migrate

# 5. 导入最终词表（1079 词，含资料与 sortOrder）
pnpm db:seed
pnpm --filter @englis-vocabulary/server prisma:import-final

# 6. 一条命令同时启动后端（:3000）与小程序 watch
pnpm dev
```

后端地址：`http://localhost:3000/api`

小程序工程输出目录：**`apps/miniapp/dist/dev/mp-weixin`**（开发调试用这个，改 `.vue` 会自动重编译并刷新模拟器）。`dist/build/mp-weixin` 是一次性生产构建，改源码不会自动更新。

> 提醒：端口 3000 同一时间只能有一个后端。`pnpm dev` 已包含后端，不要再另开终端执行 `pnpm dev:server`，否则报 `EADDRINUSE`。
> `apps/server/nest-cli.json` 的 `deleteOutDir` 设为 `false`：watch 模式不再清空 `dist`，避免受限环境下批量删除被拦截导致后端起不来。如需彻底清理 `dist`，手动删除后再跑 `pnpm build`。
> 页面结构变化后微信开发者工具需要**重新导入**产物目录才能看到新页面。

## 无 Docker 开发（备选）

PGlite 在 `database/.pglite/` 保存数据，通过 PostgreSQL 协议暴露 5432 端口，Prisma 代码无需改动。注意先执行 `pnpm db:down` 释放 5432 端口。

```bash
# 终端 1：首次启动（自动建表 + 写入课程数据）
pnpm db:local:init
pnpm --filter @englis-vocabulary/server prisma:import-final

# 终端 2：启动前后端
pnpm dev
```

已有数据后终端 1 改用 `pnpm db:local`。设置 `PGLITE_DATA_DIR=memory://` 可切换为内存模式（退出即清空）。

## 验证前后端是否连通

```bash
# 一个终端跑 pnpm dev，看到 NestJS server ready 和 ready in XXXXms 即前后端都起来了
curl http://localhost:3000/api/health
curl http://localhost:3000/api/catalog/stages   # 需登录态
```

完整 cURL 清单见 `docs/API-Specification.md`。

**端到端测试**（需后端已在 3000 端口运行）：

```bash
pnpm test:e2e                                    # 49 项
pnpm --filter @englis-vocabulary/server test     # 单测 18 项
pnpm typecheck
```

微信开发者工具 → 导入项目 → 目录选 `/Users/yktc/Documents/english-vocabulary/apps/miniapp/dist/dev/mp-weixin`，AppID 自动带出 `wx9ed13f9f8cbcf771`。勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」。

> 为什么导入 `dist` 下的目录：微信开发者工具只认识小程序原生格式（`app.json` / `app.js` / `.wxml`），不认识 `.vue`。uni-app 编译时把 `project.config.json` 直接生成在产物目录里，所以导入产物那一层即可。

## 体验完整学习闭环

1. 首页点 **Start Review** → 无到期复习时直接进入新词学习；有到期复习则 Review 页逐词独立拼写。
2. 答错显示正确答案与音标，点 **Try Again** 独立重输；立即重试按 `immediate_retry` 提交，不计入有效掌握。
3. 复习队列跑完 → **New Word** 页学习 → **I've Learned This Word** → **Writing** 页拼写测试。
4. 每完成 10 个新词弹窗询问是否继续：**Continue Learning** 继续下一批，**Finish for Today** 结束学习。
5. 全部完成 → **Daily Result** → **Back to Home**。中途退出会保存断点，下次进入自动恢复。
6. 在 **Vocabulary** 页点开已掌握的词，可 **I Forgot This Word**，该词会重新进入复习队列。

## 常用命令

```bash
pnpm dev            # 同时启动后端 + 小程序（推荐）
pnpm dev:server     # 只启动 NestJS（watch）
pnpm dev:miniapp    # 只启动 uni-app 小程序（watch）
pnpm build          # 构建后端与小程序
pnpm typecheck      # 前后端类型检查
pnpm test:e2e       # 端到端测试（49 项，需后端在 3000 端口运行）
pnpm --filter @englis-vocabulary/server test  # 后端单测（18 项）
pnpm db:generate    # 重新生成 Prisma Client
pnpm db:migrate     # 开发期迁移并生成 migration
pnpm db:deploy      # 应用现有 migration（生产环境）
pnpm db:seed        # 写入 5 阶段 + 100 基础词（幂等）
pnpm --filter @englis-vocabulary/server prisma:import-final  # 全量导入最终 1079 词表
pnpm db:up / db:down  # 启动 / 停止 PostgreSQL 容器
```

H5 预览：`pnpm --filter @englis-vocabulary/miniapp dev:h5 -- --port 8081`。H5 的 `rpx` 换算与微信真机不同，只用于冒烟检查，**UI 还原度以微信开发者工具为准**。

## 关键实现说明

- **`.env` 定位**：后端 `app.module.ts` 的 `findEnvFiles()` 从进程目录向上查找，无论从仓库根、`apps/server` 还是其它目录启动都读到同一份密钥，不会静默回退到开发默认密钥。
- **登录时机**：`App.vue` 的 `onLaunch` 统一调用 `userStore.ensureUser()`；各页面的调用由 store 的 in-flight Promise 合并，不会重复 `wx.login`。
- **断点恢复**：会话快照存 `DailyLearning.lastLearningPosition` 并同步本地 storage，按 `savedAt` 取较新者，跨日失效。
- **词表数据工程**：两份 Excel → 六项清洗 → 按基准词表过滤 → 拆分 a/an、补 be 动词 → 1079 词。中间文件在 `data/integration/`，最终词表 `final-wordlist.json`，导入前全库备份在 `data/integration/backups/`（gitignore）。
- **Prisma 迁移**：修改 schema 后依次执行 `pnpm db:generate` 和 `pnpm db:migrate`。

## 联调注意事项

- **域名校验**：开发者工具勾选「不校验合法域名…」。`localhost` 只在电脑模拟器有效；真机预览需把 `apps/miniapp/.env` 的 `VITE_API_BASE_URL` 改为电脑局域网 IP，手机与电脑同一 Wi-Fi。
- **AppID**：`wx9ed13f9f8cbcf771`，在 `apps/miniapp/src/manifest.json` 的 `mp-weixin.appid`。顶层 DCloud AppID 保持为空，构建时「Appid 未配置」提示不影响微信端。
- **微信登录**：服务端需配置 `WECHAT_APP_SECRET` 与高强度的 `AUTH_TOKEN_SECRET`。
- **自定义导航栏**：Home、学习流程页与 Vocabulary / Progress / Profile 使用 `navigationStyle: custom`。
- **端口冲突**：`EADDRINUSE port 3000` 表示已有后端在跑，不要重复启动。
- **数据库配置**：根目录 `.env` 的 `DATABASE_URL` 中 `pgbouncer=true&connection_limit=1` 为兼容 PGlite 添加，对真实 PostgreSQL 无副作用。数据存于 Docker 卷 `database_postgres_data`，`pnpm db:down` 只停容器、不删数据。
- **发音素材**：`pronunciationUrl` 为空，接入音频地址与播放器即可生效。
- **提交状态**：本地 `main` 与 `origin/main` 一致，工作区干净。

## 文档索引

- `prd.md` — 产品需求文档 V1.2（完整需求，用户提供）
- `docs/UI-Specification.md` — UI 规范与页面还原说明
- `docs/Database-Design.md` — 数据库设计
- `docs/API-Specification.md` — 接口约定与 cURL 清单
- `docs/PRD.md` — 里程碑概览（指向根目录 `prd.md`）
- `database/README.md` — 数据库运行方式
