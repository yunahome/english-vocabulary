# 数据库

本目录存放 PostgreSQL 运行环境配置。

- `pglite-server.mjs`：无 Docker 的本地开发数据库（PGlite，文件持久化）。
- `docker-compose.yml`：本地 PostgreSQL 16 容器配置。
- Prisma Schema 与 Migration 位于 `apps/server/prisma/`，由后端统一维护。

### 使用 Docker（推荐）

```bash
# 在仓库根目录
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm db:seed
```

连接串默认写在根目录 `.env` 的 `DATABASE_URL`。
数据保存在 Docker 卷 `postgres_data` 中；`pnpm db:down` 只停容器、不删数据。

### 无 Docker（备选）

先执行 `pnpm db:down` 释放 5432 端口，然后：

```bash
# 仓库根目录，终端 1（首次）
pnpm db:local:init

# 终端 2
pnpm dev
```

已有数据后终端 1 改用 `pnpm db:local`。

PGlite 数据保存在 `database/.pglite/`，已加入 `.gitignore`。
设置 `PGLITE_DATA_DIR=memory://` 可切换为内存模式。
