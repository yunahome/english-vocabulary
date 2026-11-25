# Database Design

数据库：PostgreSQL 16。ORM：Prisma。

## 表结构

### `Word` 单词表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| word | text | 单词，唯一索引 |
| phonetic | text? | 音标 |
| meaning | text | 释义 |
| example | text? | 例句 |
| createdAt | timestamp | 创建时间 |
| updatedAt | timestamp | 更新时间 |

### `User` 用户表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| openid | text? | 微信 openid，唯一索引 |
| nickname | text? | 昵称 |
| createdAt / updatedAt | timestamp | 时间戳 |

### `LearningRecord` 学习记录表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| userId | uuid | 外键 -> User |
| wordId | uuid | 外键 -> Word |
| familiarity | int | 熟悉度，默认 0 |
| reviewCount | int | 复习次数，默认 0 |
| lastReviewedAt | timestamp? | 上次复习时间 |

约束：`(userId, wordId)` 唯一索引。

完整定义见 `apps/server/prisma/schema.prisma`。
