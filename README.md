# englis-vocabulary

背单词微信小程序技术骨架。

> 项目名按需求原文使用 `englis-vocabulary`（`englis` 无 h）。

## 技术栈

| 层级 | 选型 |
| --- | --- |
| 小程序框架 | uni-app |
| 前端框架 | Vue 3 |
| 开发语言 | TypeScript |
| 构建工具 | Vite |
| 状态管理 | Pinia |
| 后端运行环境 | Node.js |
| 后端框架 | NestJS |
| 数据库 | PostgreSQL 16 |
| ORM | Prisma |
| API | REST |
| 文件存储 | 腾讯云 COS（待接入） |
| 部署 | 腾讯云轻量应用服务器（待接入） |
| 代码管理 | Git |
| 接口测试 | Postman |

## 目录结构

```
englis-vocabulary/
├── apps/
│   ├── miniapp/        # uni-app Vue3 微信小程序
│   └── server/         # NestJS 后端
├── packages/
│   └── shared/         # 前后端共享 TypeScript 类型
├── database/           # PostgreSQL docker-compose 配置
├── docs/               # PRD / UI / 数据库 / API 文档
├── package.json
└── pnpm-workspace.yaml
```

## 环境要求

- Node.js >= 20（推荐 22）
- pnpm 12（`corepack enable pnpm`）
- Docker（用于本地 PostgreSQL）
- 微信开发者工具（用于预览小程序）

## 快速开始

```bash
cd /Users/yktc/Documents/englis-vocabulary

# 1. 安装依赖并生成 Prisma Client
pnpm setup

# 2. 准备环境变量
cp .env.example .env

# 3. 启动 PostgreSQL（需要 Docker）
pnpm db:up

# 4. 初始化数据库结构
pnpm db:migrate
pnpm db:seed

# 5. 同时启动后端与小程序
pnpm dev
```

后端地址：`http://localhost:3000/api`
小程序工程输出目录：`apps/miniapp/dist/build/mp-weixin`

## 单独启动

```bash
pnpm dev:server    # NestJS watch
pnpm dev:miniapp   # uni-app 微信小程序
```

## 常用命令

```bash
pnpm typecheck     # 前后端类型检查
pnpm build         # 构建后端与小程序
pnpm db:generate   # 重新生成 Prisma Client
pnpm db:deploy     # 应用 migration（生产环境）
```

## 联调注意

微信小程序默认校验域名。开发时请在微信开发者工具中勾选
「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」，
或把 `VITE_API_BASE_URL` 改成局域网 IP。
