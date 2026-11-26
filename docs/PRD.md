# PRD：背单词小程序

> 完整产品需求见项目根目录 `prd.md`（V1.2，用户提供）。本文档只记录里程碑进度。

## 产品定位

一款以英语词汇学习为核心、采用游戏化闯关方式的微信小程序。核心目标不是「看过多少词」，而是让用户能在没有提示的情况下独立拼写出来。

核心学习闭环：课程闯关 → 学习新词 → 独立拼写 → 间隔复习 → 达到掌握标准 → 词库沉淀 → 阶段解锁。

## 里程碑

### M0：工程骨架 ✅

- [x] pnpm monorepo：小程序 / 后端 / 共享类型 / 数据库 / 文档
- [x] uni-app + Vue 3 + TypeScript + Vite + Pinia
- [x] NestJS + Prisma + PostgreSQL + REST
- [x] Docker PostgreSQL + PGlite 无 Docker 备选
- [x] 统一响应 `{ code, data, message }`、全局异常过滤、CORS
- [x] 前后端与数据库端到端联调通过

### M1：数据与业务规则 ✅

- [x] 17 张业务表（课程 / 词汇 / 关联 / 掌握 / 进度 / 每日任务）
- [x] 5 个学习阶段初始化；Elementary → Unit 1 → Level 1 的第一批 5 个课程词
- [x] 课程树、词义、关卡/阶段词接口
- [x] 三次有效正确书写才 mastered、立即重试不计、答错清零、+7 天复习、主动遗忘回退
- [x] 每日任务按当前阶段必学词义生成（最低 5 个）、阶段/关卡解锁
- [x] 首页聚合接口 `/api/home/summary`

### M2：小程序核心闭环 ✅

- [x] 4 个 Tab：Home / Vocabulary / Progress / Profile
- [x] Home 首页（按 UI 图 1:1 还原，真实数据驱动）
- [x] Review 复习页（独立拼写、答错显示答案 + Try Again）
- [x] New Word 新词学习页、Writing 拼写测试页
- [x] Daily Result 每日总结页
- [x] 学习会话 store 串联完整流程，接入拼写提交与每日任务
- [x] Vocabulary 词库（筛选 / 搜索 / 详情 / 主动标记遗忘）
- [x] UI 设计稿素材裁切与接入

### M3：身份鉴权与规则强化 ✅

- [x] 微信登录：小程序 `wx.login` → 服务端 `code2Session` 换取 openid → 签发 HMAC 会话 Token
- [x] 全局 `AuthGuard`：`userId` 从 Token 注入，业务接口不再通过查询参数传入
- [x] 严格阶段解锁：`unlockNextStage` 校验当前阶段全部必学词义 mastered，否则拒绝解锁
- [x] 7 天间隔服务端强校验：`mastery-rules.ts` 作为掌握规则唯一入口，相邻有效正确不足 7 天不计入（首次→第三次 ≥14 天由相邻间隔自然满足）
- [x] 用户时区持久化：`User.timezone` + `dateKeyInTimeZone`，每日任务按用户自然日计算
- [x] 单元测试 11 项：时区 / 掌握规则 / Token 签名与过期校验

### M4：学习流程完善 ✅

- [x] 每 10 个新词询问是否继续（PRD 5.2）：Writing 页完成第 10/20/30... 词后弹窗，Continue Learning 继续、Finish for Today 进入每日总结；5~9 词时提供主动结束入口
- [x] 每日新词无上限（PRD 5.4）：当日 new 任务覆盖当前阶段全部未学必学词（Level 1 现有 12 个占位词），不再截断为 5 个
- [x] 新词计数去重（PRD 5.3）：同一词义重试答对只计一次，前后端口径一致（端到端验证第 10 词时 `newWordCount=10`）

### 后续（未实现）

对照根目录 `prd.md` 第 14 章 MVP 17 项，剩余：

- [ ] 学习断点恢复（PRD 7.2：阶段 / Unit / Level / 当前词 / 任务类型 / 已完成数 / 弹窗等待态）
- [ ] 补掌握模式（PRD 3.3：当前阶段新词学完后不再强制每日 5 新词，改为未掌握词复习任务）
- [ ] 真实发音音频与腾讯云 COS 素材托管
- [ ] 学习提醒、复杂成就与社交
- [ ] 部署到云端

## 核心用户流程（已跑通）

1. 打开小程序 → Home 首页展示今日任务。
2. 点 Start Review → 有到期复习先复习；无到期复习则用关卡词做首次独立拼写练习。
3. 答错 → 显示答案与音标 → Try Again 独立重输。
4. 复习完成 → New Word 学习展示 → Writing 独立拼写测试。
5. 全部完成 → Daily Result 每日总结 → 返回 Home，统计同步更新。
6. 词库中可对已掌握词标记 I Forgot This Word，重新进入复习队列。
