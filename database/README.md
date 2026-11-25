# 数据库

本目录存放 PostgreSQL 运行环境配置。

- `docker-compose.yml`：本地 PostgreSQL 16 容器配置。
- Prisma Schema 与 Migration 位于 `apps/server/prisma/`，由后端统一维护。

启动数据库：

```bash
# 在仓库根目录
cp .env.example .env
pnpm db:up
```

连接串默认写在根目录 `.env` 的 `DATABASE_URL`。
