# english-vocabulary

背单词微信小程序项目：uni-app（Vue 3）+ NestJS + PostgreSQL，前后端独立运行、同一 Git 仓库管理。

> 本地目录：`/Users/yktc/Documents/english-vocabulary`
> Git 远程：`https://github.com/yunahome/english-vocabulary.git`（`main` 分支）

当前状态：**骨架已搭好，端到端数据链路已实测跑通**（PostgreSQL → NestJS REST → 小程序页面）。学习记录 API、微信登录、云端部署等属于后续阶段，尚未实现。

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

规划中（未接入）：腾讯云 COS、微信登录、轻量应用服务器部署、学习记录 API。

## 目录结构

```
english-vocabulary/
├── apps/
│   ├── miniapp/                      # uni-app Vue3 微信小程序
│   │   ├── src/
│   │   │   ├── api/                  # request.ts 请求封装、words.ts 接口
│   │   │   ├── stores/               # Pinia store
│   │   │   ├── pages/index/          # 单词本页面
│   │   │   ├── pages.json            # 页面路由
│   │   │   ├── manifest.json         # 微信 AppID 等原生配置
│   │   │   └── uni.scss              # 全局样式变量
│   │   └── dist/                     # 编译产物（gitignore）
│   │       ├── dev/mp-weixin/        # pnpm dev 输出，带热更新
│   │       └── build/mp-weixin/      # pnpm build 输出，生产用
│   └── server/                       # NestJS 后端
│       ├── prisma/
│       │   ├── schema.prisma         # Word / User / LearningRecord 模型
│       │   ├── migrations/           # 初始 migration SQL
│       │   └── seed.ts               # 示例单词
│       └── src/
│           ├── main.ts               # 全局前缀、CORS、校验、拦截器、过滤器
│           ├── app.module.ts
│           ├── health/               # GET /api/health
│           ├── words/                # GET/POST /api/words
│           ├── common/               # 统一响应与异常过滤
│           └── prisma.*.ts           # PrismaService / PrismaModule
├── packages/
│   └── shared/src/index.ts           # 前后端共享 TypeScript 类型
├── database/
│   ├── docker-compose.yml            # PostgreSQL 16 容器
│   ├── pglite-server.mjs             # 无 Docker 时的本地数据库
│   └── README.md
├── docs/                             # PRD / UI / 数据库 / API 设计文档
├── pnpm-workspace.yaml
└── package.json                      # 根目录统一脚本
```

## 已实现功能

- **数据库**：17 张业务表，覆盖课程（Stage/Unit/Level）、词汇（Word/WordSense/WordForm）、关联（LevelWord/StageWord）、用户掌握（UserWord/WritingRecord）、进度与每日任务（UserStage/UserLevel/DailyLearning/DailyTask/ReviewRecord）六大模块。
- **后端接口**（完整清单见 `docs/API-Specification.md`）：
  - `GET /api/health`：健康检查
  - `GET /api/words`、`POST /api/words`：原单词接口（向后兼容）
  - `POST /api/users`、`GET /api/users`：用户
  - `/api/catalog/*`：课程树、单词带词义、关卡/阶段词义
  - `/api/learning/*`：提交拼写、掌握状态、到期复习、标记遗忘
  - `/api/progress/*`：阶段/关卡进度、每日任务生成与完成
  - 统一响应结构、DTO 校验、全局异常处理、CORS 放开。
- **业务规则**（在后端 Service 中实现，非数据库约束）：
  - 每次测试写入 WritingRecord 保留完整历史；
  - 只有「独立作答 + 计划测试」计入有效掌握，立即重试不计；
  - 连续 3 次有效正确 → mastered；每次正确后 nextReviewAt = +7 天；
  - 答错 streak 清零、标记遗忘回退状态；阶段/关卡按顺序解锁。
- **小程序**：请求封装（自动拆包 `code/data/message`）、Pinia 单词 store、单词本页面（列表 + 新增）。业务接口已就绪，页面尚未接入课程/学习流程。
- **共享类型**：课程、词汇、用户、学习提交、进度与每日任务的 DTO。

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

# 4. 建表 + 写入 3 个示例单词（首次）
pnpm db:migrate
pnpm db:seed

# 5. 一条命令同时启动后端（:3000）与小程序 watch
pnpm dev
```

后端地址：`http://localhost:3000/api`

小程序工程输出目录：**`apps/miniapp/dist/dev/mp-weixin`**（开发调试用这个，改 `.vue` 会自动重编译并刷新模拟器）。`dist/build/mp-weixin` 是一次性生产构建，改源码不会自动更新。

> 提醒：端口 3000 同一时间只能有一个后端。`pnpm dev` 已包含后端，不要再另开终端执行 `pnpm dev:server`，否则报 `EADDRINUSE`。

## 无 Docker 开发（备选）

PGlite 在 `database/.pglite/` 保存数据，通过 PostgreSQL 协议暴露 5432 端口，Prisma 代码无需改动。注意先执行 `pnpm db:down` 释放 5432 端口。

```bash
# 终端 1：首次启动（自动建表 + 写入示例单词）
pnpm db:local:init

# 终端 2：启动前后端
pnpm dev
```

已有数据后终端 1 改用 `pnpm db:local`。设置 `PGLITE_DATA_DIR=memory://` 可切换为内存模式（退出即清空）。

## 如何自行验证前后端是否连通

用**一个终端**执行 `pnpm dev`，看到 `NestJS server ready` 和 `ready in XXXXms` 即前后端都起来了。然后按顺序：

**第 1 步：确认数据库容器**

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```
应看到 `englis-vocabulary-postgres` 为 `Up (healthy)`，端口 5432。

**第 2 步：curl 验证接口（不必打开小程序）**

```bash
# 健康检查 → {"code":0,"data":{"status":"ok",...},"message":"ok"}
curl http://localhost:3000/api/health

# 读取单词 → 返回 3 条示例单词，验证 数据库 → 后端
curl http://localhost:3000/api/words

# 新增单词 → HTTP 201，验证写入链路（注意 -H 和 -d 前面的短横杠不能漏）
curl -X POST http://localhost:3000/api/words \
  -H 'Content-Type: application/json' \
  -d '{"word":"persist","meaning":"坚持"}'

# 再查一次，确认刚写的单词已持久化
curl http://localhost:3000/api/words
```
也可用 Postman 发同样的请求。

**第 3 步：验证小程序端到端**

微信开发者工具 → 导入项目 → 目录选：
```
/Users/yktc/Documents/english-vocabulary/apps/miniapp/dist/dev/mp-weixin
```
AppID 自动带出 `wx9ed13f9f8cbcf771`。勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」。

预期：页面显示示例单词列表；输入单词和释义、点「添加单词」，新词出现在列表顶部。若报错，页面显示来自后端 `message` 的错误文案。

> 为什么导入 `dist` 下的目录：微信开发者工具只认识小程序原生格式（`app.json` / `app.js` / `.wxml`），不认识 `.vue`。uni-app 编译时把配置 `project.config.json` 直接生成在产物目录里，所以导入产物那一层即可。（Taro 是把配置放项目根、用 `miniprogramRoot` 指向 `dist/`，因此看起来能导入父目录，本质同样是运行编译产物。）

## 常用命令

```bash
pnpm dev            # 一条命令同时启动后端 + 小程序（推荐）
pnpm dev:server     # 只启动 NestJS（watch）
pnpm dev:miniapp    # 只启动 uni-app 小程序（watch，输出 dist/dev/mp-weixin）
pnpm build          # 构建后端与小程序（输出 dist/build/mp-weixin）
pnpm typecheck      # 前后端类型检查
pnpm db:generate    # 重新生成 Prisma Client
pnpm db:migrate     # 开发期迁移并生成 migration
pnpm db:deploy      # 应用现有 migration（生产环境，非交互式）
pnpm db:seed        # 写入示例单词
pnpm db:up / db:down  # 启动 / 停止 PostgreSQL 容器
```

H5 预览：`pnpm --filter @englis-vocabulary/miniapp dev:h5`（根 package.json 没有此脚本，需带 filter）。

修改 Prisma Schema 后依次执行 `pnpm db:generate` 和 `pnpm db:migrate`。

## 联调注意事项

- **域名校验**：开发者工具勾选「不校验合法域名…」。`localhost` 只在电脑上的模拟器有效；真机预览需把 `apps/miniapp/.env` 的 `VITE_API_BASE_URL` 改为电脑局域网 IP（如 `http://192.168.48.108:3000/api`），手机与电脑同一 Wi-Fi。
- **AppID**：`wx9ed13f9f8cbcf771`，在 `apps/miniapp/src/manifest.json` 的 `mp-weixin.appid`。顶层 `appid` 是 DCloud 的 uni-app AppID，保持为空；构建时 "Appid 未配置" 提示不影响微信端。
- **端口冲突**：`EADDRINUSE port 3000` 表示已有后端在跑，不要重复启动，直接用即可。
- **数据库配置**：根目录 `.env` 的 `DATABASE_URL` 中 `pgbouncer=true&connection_limit=1` 原本为兼容 PGlite 添加，对真实 PostgreSQL 无副作用。数据存于 Docker 卷 `database_postgres_data`，`pnpm db:down` 只停容器、不删数据。
- **提交状态**：本地 `main` 领先 GitHub 远端若干提交，尚未推送。

## 文档索引

- `docs/PRD.md` — 产品需求
- `docs/UI-Specification.md` — UI 规范
- `docs/Database-Design.md` — 数据库设计
- `docs/API-Specification.md` — 接口约定
- `database/README.md` — 数据库运行方式
