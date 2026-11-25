# english-vocabulary

背单词微信小程序项目骨架：uni-app 小程序 + NestJS 后端 + PostgreSQL，前后端独立运行、同一 Git 仓库管理。

> 本地目录名与 Git 远程仓库名均已统一为 `english-vocabulary`，本地路径 `/Users/yktc/Documents/english-vocabulary`，远程地址 `https://github.com/yunahome/english-vocabulary.git`。

当前状态：**技术骨架已搭好，并有一条端到端跑通的数据链路**（数据库 → 后端 REST → 小程序页面）。学习记录、微信登录、云端部署等属于后续阶段，尚未实现。

## 技术栈

| 层级 | 选型 | 版本 |
| --- | --- | --- |
| 小程序框架 | uni-app（目标：微信小程序） | 3.0.0-5030420261029002 |
| 前端框架 | Vue 3 | 3.4.21 |
| 开发语言 | TypeScript | 前端 4.9.5 / 后端 5.4.5 |
| 构建工具 | Vite | 5.2.8 |
| 状态管理 | Pinia | 2.1.7 |
| 后端运行环境 | Node.js | >= 20（推荐 22） |
| 后端框架 | NestJS | 11 |
| 数据库 | PostgreSQL | 16（Docker 容器） |
| ORM | Prisma | 6.19.3 |
| API 风格 | REST | 统一 `{ code, data, message }` |
| 包管理 | pnpm workspace | 12 |
| 代码管理 | Git | — |

规划中（未接入）：腾讯云 COS 文件存储、微信登录、轻量应用服务器部署、学习记录 API。

## 目录结构

```
english-vocabulary/
├── apps/
│   ├── miniapp/                  # uni-app Vue3 微信小程序
│   │   └── src/
│   │       ├── api/              # request.ts 请求封装、words.ts 接口
│   │       ├── stores/           # Pinia store
│   │       ├── pages/index/      # 单词本示例页
│   │       ├── pages.json        # 页面路由
│   │       ├── manifest.json     # 微信 AppID 等原生配置
│   │       └── uni.scss          # 全局样式变量
│   └── server/                   # NestJS 后端
│       ├── prisma/
│       │   ├── schema.prisma     # Word / User / LearningRecord 模型
│       │   ├── migrations/       # 初始 migration SQL
│       │   └── seed.ts           # 示例单词
│       └── src/
│           ├── main.ts           # 全局前缀、CORS、校验、拦截器、过滤器
│           ├── app.module.ts
│           ├── health/           # GET /api/health
│           ├── words/            # GET/POST /api/words
│           ├── common/           # 统一响应与异常过滤
│           └── prisma.*.ts       # PrismaService / PrismaModule
├── packages/
│   └── shared/src/index.ts       # 前后端共享 TypeScript 类型
├── database/
│   ├── docker-compose.yml        # PostgreSQL 16 容器
│   ├── pglite-server.mjs         # 无 Docker 时的本地数据库
│   └── README.md
├── docs/                         # PRD / UI / 数据库 / API 设计文档
├── pnpm-workspace.yaml
└── package.json                  # 根目录统一脚本
```

## 已实现功能

- **数据库**：`Word`、`User`、`LearningRecord` 三个模型（`User` / `LearningRecord` 已建表但尚无 API）。
- **后端接口**：
  - `GET /api/health` 健康检查
  - `GET /api/words` 单词列表
  - `POST /api/words` 新增单词
  - 统一响应结构、DTO 校验、全局异常处理、CORS 放开。
- **小程序**：请求封装（自动拆包 `code/data/message`）、Pinia 单词 store、单词本页面（列表 + 新增）。
- **共享类型**：`WordDto`、`CreateWordInput`、`ApiResponse`、`HealthDto`。

## 环境要求

- Node.js >= 20（推荐 22）
- pnpm 12：`corepack enable pnpm`
- Docker Desktop：运行 PostgreSQL 容器（本机已安装）
- 微信开发者工具：预览小程序

不需要单独安装 `psql` 或原生 PostgreSQL。

## 快速开始（Docker，推荐）

```bash
cd /Users/yktc/Documents/english-vocabulary

# 1. 安装依赖并生成 Prisma Client
pnpm setup

# 2. 准备环境变量（首次）
cp .env.example .env

# 3. 启动 PostgreSQL 容器（postgres:16-alpine，端口 5432）
pnpm db:up

# 4. 建表 + 写入 3 个示例单词
pnpm db:migrate
pnpm db:seed

# 5. 同时启动后端（:3000）与小程序
pnpm dev
```

后端地址：`http://localhost:3000/api`
小程序工程输出目录：`apps/miniapp/dist/build/mp-weixin`

如果终端提示 `docker: command not found`：Docker Desktop 已把 CLI 写入 `~/.zprofile`，但已打开的终端不会自动生效。**新开一个终端窗口**，或执行 `source ~/.zprofile`，再用 `docker --version` 验证。同时保持 Docker Desktop 处于运行状态。

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

按顺序做下面四步，每步都有明确的预期结果。

**第 1 步：确认数据库容器在跑**

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

应看到 `englis-vocabulary-postgres` 状态为 `Up (healthy)`，端口映射 `5432`。

**第 2 步：启动后端**

```bash
pnpm dev:server
```

看到 `NestJS server ready: http://localhost:3000/api` 即启动成功。

**第 3 步：用 curl 验证接口（不必打开小程序）**

```bash
# 健康检查
curl http://localhost:3000/api/health
# 预期：{"code":0,"data":{"status":"ok","timestamp":"..."},"message":"ok"}

# 读取单词（验证 数据库 → 后端）
curl http://localhost:3000/api/words
# 预期：{"code":0,"data":[{ "word": "vocabulary", ... }, ...],"message":"ok"}

# 新增单词（验证 写入链路）
curl -X POST http://localhost:3000/api/words \
  -H 'Content-Type: application/json' \
  -d '{"word":"persist","meaning":"坚持"}'
# 预期：HTTP 201，{"code":0,"data":{...},"message":"ok"}

# 再查一次，确认刚写的单词已持久化
curl http://localhost:3000/api/words
```

也可以用 Postman 导入同样的 URL 和 JSON body 测试。

**第 4 步：验证小程序端到端**

```bash
pnpm dev              # 启动后端 + 小程序
# 或单独构建：pnpm --filter @englis-vocabulary/miniapp build
```

打开微信开发者工具 → 导入 `apps/miniapp/dist/build/mp-weixin` → 勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」。

预期：页面加载后显示 3 条示例单词；在输入框填单词和释义、点「添加单词」，新词会出现在列表顶部。若接口报错，页面会显示错误文案（来自后端 `message`）。

> 注意：`localhost` 只在电脑上的开发者工具里有效。真机预览时把 `apps/miniapp/.env` 的 `VITE_API_BASE_URL` 改成电脑局域网 IP（如 `http://192.168.x.x:3000/api`），并确保手机与电脑同一 Wi-Fi。

## 单独启动与常用命令

```bash
pnpm dev:server    # 只启动 NestJS（watch）
pnpm dev:miniapp   # 只启动 uni-app 微信小程序
pnpm dev:h5        # H5 预览：pnpm --filter @englis-vocabulary/miniapp dev:h5
pnpm typecheck     # 前后端类型检查
pnpm build         # 构建后端与小程序
pnpm db:generate   # 重新生成 Prisma Client
pnpm db:deploy     # 应用 migration（生产环境，非交互式）
pnpm db:migrate    # 开发期迁移并生成 migration
pnpm db:seed       # 写入示例单词
pnpm db:up / db:down  # 启动 / 停止 PostgreSQL 容器
```

修改 Prisma Schema 后，依次执行 `pnpm db:generate` 和 `pnpm db:migrate`。

## 联调注意

- 微信小程序默认校验请求域名。开发时勾选「不校验合法域名…」，或把 `VITE_API_BASE_URL` 改成局域网 IP。
- 微信 AppID 已配置为 `wx9ed13f9f8cbcf771`，位置在 `apps/miniapp/src/manifest.json` 的 `mp-weixin.appid`。顶层 `appid` 是 DCloud 的 uni-app AppID，不是微信 AppID，保持为空即可；构建时提示 "Appid 未配置" 不影响微信端运行。
- 根目录 `.env` 中 `DATABASE_URL` 的 `pgbouncer=true&connection_limit=1` 原本为兼容 PGlite 添加，对真实 PostgreSQL 无副作用。
- 数据库数据存于 Docker 卷 `postgres_data`，`pnpm db:down` 只停容器、不删数据。

## 文档索引

- `docs/PRD.md` — 产品需求
- `docs/UI-Specification.md` — UI 规范
- `docs/Database-Design.md` — 数据库设计
- `docs/API-Specification.md` — 接口约定
- `database/README.md` — 数据库运行方式
