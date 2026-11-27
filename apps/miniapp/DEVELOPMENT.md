# 前端开发指南

这份文档说明小程序前端（`apps/miniapp`）的代码结构、关键设计和开发方式。假设你熟悉 Vue 3 + TypeScript，但不熟悉 uni-app 和这个项目的业务状态机。

后端对照文档：`../server/DEVELOPMENT.md`。产品需求：`../../prd.md`。

---

## 一、技术栈与它带来的约束

| 层 | 选型 | 说明 |
|---|---|---|
| 框架 | uni-app 3.0 + Vue 3.4 | 一套代码编译到微信小程序（也支持 H5 冒烟） |
| 构建 | Vite 5 | uni-app 底层用 Vite，你不用直接配它 |
| 状态 | Pinia 2 | 相当于 React 的 zustand |
| 语言 | TypeScript 4.9 | 比后端的 5.4 旧，注意语法兼容 |
| 样式 | `uni.scss` + rpx 单位 | rpx 是小程序响应式单位，750rpx = 屏宽 |
| 类型共享 | `@englis-vocabulary/shared` | 前后端共用 DTO 定义，改类型两边都受影响 |

### uni-app 和纯 Vue 的三个关键差异

1. **没有 `react-router` / `vue-router`**，路由在 `src/pages.json` 里静态声明。跳转用 `uni.navigateTo` / `uni.redirectTo` / `uni.switchTab`，不是 `router.push`。
2. **不能用 DOM API**。没有 `document`、`window`，模板里是 `<view>` / `<text>` / `<image>` 而不是 `<div>` / `<span>` / `<img>`。全局对象是 `uni`。
3. **编译产物才是运行代码**。微信开发者工具导入的是 `dist/dev/mp-weixin`，不是 `src`。改 `.vue` 后要重新编译（watch 模式自动做）。

---

## 二、启动与调试

```bash
# 仓库根目录
pnpm dev              # 同时启动后端 + 小程序 watch（推荐）

# 只跑前端
cd apps/miniapp
pnpm dev              # uni -p mp-weixin，输出到 dist/dev/mp-weixin
pnpm build            # 生产构建，输出到 dist/build/mp-weixin
pnpm type-check       # vue-tsc 类型检查
pnpm dev:h5 -- --port 8081   # H5 冒烟（rpx 换算与真机不同，不能用来验 UI）
```

**导入微信开发者工具**：目录选 `apps/miniapp/dist/dev/mp-weixin`，AppID `wx9ed13f9f8cbcf771`，勾选"不校验合法域名"。

**调试链路**：`src/api/request.ts` 里的 `DEFAULT_BASE_URL = 'http://localhost:3000/api'`。真机预览要改成电脑局域网 IP（改 `apps/miniapp/.env` 的 `VITE_API_BASE_URL`），手机和电脑同一 Wi-Fi。

**后端必须同时跑着**，否则所有接口 401 或网络错误。后端起不来看 `../server/DEVELOPMENT.md`。

---

## 三、目录结构

```
src/
├── main.ts              createSSRApp + createPinia（uni-app 的固定写法）
├── App.vue              全局样式 + onLaunch 触发登录
├── pages.json           ★ 页面路由 + 原生 tabBar 配置
├── manifest.json        微信 AppID 等原生配置
├── uni.scss             全局样式变量
│
├── api/                 ★ 所有后端接口封装（7 个文件）
│   ├── request.ts       ★ 统一请求：拼 baseURL、带 token、拆 {code,data,message}
│   ├── auth.ts          登录 / 当前用户
│   ├── catalog.ts       课程树 / 全量词库 / 关卡词
│   ├── learning.ts      提交拼写 / 词状态 / 到期复习 / 标记遗忘
│   ├── progress.ts      每日任务 / 完成任务 / 断点保存 / 阶段与关卡
│   ├── home.ts          首页聚合
│   └── words.ts         词库查询
│
├── stores/              状态管理（3 个）
│   ├── user.ts          ★ 登录态、token、in-flight Promise
│   ├── learning.ts      ★★ 学习会话状态机（最复杂，见第六节）
│   └── index.ts         word store（早期联调遗留，主流程未用）
│
├── utils/
│   ├── nav.ts           ★ 自定义导航高度 + 阶段→页面跳转 + 图片映射
│   ├── learning-session.ts ★ 断点快照结构、本地存储、新旧快照比较
│   ├── catalog-cache.ts    词库缓存（24h，key 含版本号）
│   └── auth-storage.ts     token 的本地读写
│
├── pages/
│   ├── home/             Tab：首页
│   ├── vocabulary/       Tab：词库
│   ├── progress/         Tab：阶段进度
│   ├── profile/          Tab：我的
│   ├── review/           流程页：复习拼写
│   ├── word-learning/    流程页：新词展示
│   ├── writing/          流程页：拼写测试 + 10 词弹窗
│   ├── daily-result/     流程页：每日总结
│   └── index/            早期联调页（保留，不在 tabBar）
│
└── static/
    ├── tab-*.png         8 个 Tab 图标（由 apps/miniapp/scripts/gen-tab-icons.mjs 生成）
    └── assets/           从 UI 设计稿裁出的插画与词图
```

### 标 ★ 的文件

| 文件 | 为什么重要 |
|---|---|
| `pages.json` | 新增页面必须在这里注册，否则跳转 404 |
| `api/request.ts` | 所有接口都走它，改鉴权/错误处理只改这里 |
| `stores/user.ts` | 登录时机的唯一入口 |
| `stores/learning.ts` | 整个学习流程的状态机，项目最核心的前端文件 |
| `utils/nav.ts` | 断点恢复后靠它跳回正确页面 |
| `utils/learning-session.ts` | 断点快照的结构定义与读写 |

---

## 四、请求层：从页面到后端

### 4.1 请求封装

所有 API 模块都基于 `request()`：

```ts
// src/api/home.ts
export function getHomeSummary(): Promise<HomeSummaryDto> {
  return request<HomeSummaryDto>({ url: '/home/summary' })
}
```

`request()` 做四件事：

1. 拼 `baseURL + url`
2. 从本地读 token，放到 `Authorization: Bearer <token>`
3. 后端返回 `{ code, data, message }`，成功时**只把 `data` 解出来**给你
4. HTTP 401 时清本地 token（下一次 `ensureUser()` 会自愈重登）

所以你在页面里调 `getHomeSummary()` 拿到的是 `HomeSummaryDto` 本身，不需要 `.data`。

### 4.2 新加一个接口调用

```ts
// 1. 在 src/api/home.ts 加函数
export function getSomething(): Promise<SomethingDto> {
  return request<SomethingDto>({ url: '/home/something', method: 'POST', data: { x: 1 } })
}

// 2. 类型加到 packages/shared/src/index.ts（前后端共用）
export interface SomethingDto { ... }

// 3. 页面里调用
const data = await getSomething()
```

### 4.3 鉴权链路

```
App.vue onLaunch → userStore.ensureUser()
   ├─ 有本地 token → GET /api/auth/me 校验，成功就用
   └─ 无 token / 校验失败 → uni.login() 拿 code → POST /api/auth/wechat/login → 存 token

各页面 onShow/onMounted 也调 ensureUser()，但 store 用 pendingLogin
（in-flight Promise）合并并发调用，不会重复 wx.login。
```

**你不需要在页面里手动检查登录状态**，直接 `await userStore.ensureUser()` 拿 userId 即可。但**必须先 await 它，再调需要鉴权的接口**（catalog、home、learning、progress 全都需要）。

---

## 五、页面导航与生命周期

### 5.1 跳转 API 的区别

| API | 行为 | 使用场景 |
|---|---|---|
| `uni.navigateTo` | 保留当前页，压栈 | Home → Review（可以返回） |
| `uni.redirectTo` | 关闭当前页再跳 | Review → New Word（不回头） |
| `uni.switchTab` | 切 Tab，清非 Tab 栈 | 学习结束 → Home |

### 5.2 生命周期的选择

- **Tab 页**（home / progress）：用 `onShow`，因为切回 Tab 时要刷新数据（尤其 Progress 要刷新阶段解锁状态）。
- **流程页**（review / word-learning / writing / daily-result）：用 `onMounted`，因为它们是 `redirectTo` 进来的，每次都是新实例。

```ts
// home/index.vue
import { onShow } from '@dcloudio/uni-app'
onShow(load)

// review/index.vue
onMounted(async () => {
  const userId = await userStore.ensureUser()
  const phase = await learning.startReview(userId)
  redirectToPhase(phase, '/pages/review/index')
})
```

### 5.3 自定义导航栏

除了 `pages/index`，所有页面都设了 `navigationStyle: "custom"`，意思是**微信不画顶部导航栏，页面自己画**。

`utils/nav.ts` 的 `getNavMetrics()` 负责算：

- `statusBarHeight`：状态栏高度（手机型号不同）
- `rightPadding`：给右上角胶囊按钮留的位置（用 `getMenuButtonBoundingClientRect` 算）

页面模板里会用这些值做 `padding-top` 和右侧留白。H5 环境没有胶囊，函数里有 try/catch 兜底。

### 5.4 阶段 → 页面映射（断点恢复的关键）

```ts
// utils/nav.ts
export const LEARNING_PAGE = {
  review: '/pages/review/index',
  new: '/pages/word-learning/index',
  writing: '/pages/writing/index',
  result: '/pages/daily-result/index',
}

export function redirectToPhase(phase, currentPage) {
  const target = LEARNING_PAGE[phase]
  if (!target || target === currentPage) return false
  uni.redirectTo({ url: target })
  return true
}
```

每个流程页 `onMounted` 拿到恢复后的 phase，调这个函数。如果当前页面和阶段不匹配就自动跳到对的页面——这样"恢复到 writing 阶段但停在 review 页"的情况不会发生。

---

## 六、学习会话状态机（`stores/learning.ts`）

这是整个前端最复杂的文件。理解它就理解了项目 80% 的业务逻辑。

### 6.1 阶段（LearningPhase）

```ts
type LearningPhase = 'idle' | 'review' | 'new' | 'writing' | 'result'
```

正常流转：

```
Home 点 Start Study
   ↓
review（到期复习，若没有则跳过）
   ↓
new（新词展示页：图 + 词 + 释义）
   ↓
writing（拼写测试）
   ├─ 答错 → Try Again（immediate_retry，不计掌握次数）
   └─ 完成 10 个 → 弹窗询问 Continue / Finish for Today
   ↓
result（每日总结）
   ↓
Back to Home
```

### 6.2 核心状态

| 状态 | 作用 |
|---|---|
| `phase` | 当前处于哪个阶段 |
| `queue` / `index` | 复习队列与当前位置 |
| `newQueue` / `newIndex` | 新词队列与当前位置 |
| `dailyTasks` | 今日任务（来自后端） |
| `countedNewWordIds` | 已计数的新词 ID，防止重试时重复计数 |
| `pendingTenWordPrompt` / `showTenWordModal` | 10 词弹窗的两阶段状态 |
| `remediationMode` | 补掌握模式（新词学完但仍有未掌握词） |
| `stats` | 本次会话的统计（新词/复习/正确/错误/新掌握） |
| `sessionDate` / `remoteSessionRaw` | 断点恢复用 |

### 6.3 两个重要设计

**（1）乱序只发生在批次内**

后端按 10 词/批下发任务，`buildItemsByIds()` 拿到一批 ID 后用 Fisher-Yates 洗牌再展示：

```ts
return isReview ? items : shuffleBatch(items)
```

- 新词：乱序（背单词不希望总是同样顺序）
- 复习：保持到期时间顺序（有优先级，不能乱）
- **数据库 `sortOrder` 不受影响**——打乱的只是数组，断点快照保存的是打乱后的队列

**（2）任务匹配不做兜底**

```ts
const task = dailyTasks.value.find(
  (t) => t.wordSenseId === item.wordSenseId && t.taskType === taskType && t.taskStatus !== 'completed',
)
if (!task) return  // 找不到就不完成，绝不匹配别的任务
```

曾经有兜底逻辑会误完成错误的任务，已删除。

### 6.4 10 词弹窗的两阶段

```ts
// checkAnswer 里：完成第 10 个词时
if (stats.newWords % 10 === 0) pendingTenWordPrompt = true

// nextNewWord 里：等用户点 Continue 时才真正弹
if (pendingTenWordPrompt) {
  pendingTenWordPrompt = false
  showTenWordModal = true
  return phase.value  // 暂留 Writing 页
}
```

分成两个阶段是为了：答题时立刻不打断，等用户点 Continue 时再问要不要继续。

- **Continue Learning** → `continueLearning()`：重新拉任务，后端发现上一批全完成会生成下一批
- **Finish for Today** → `finishForToday()`：跳 result 页并清空断点

---

## 七、断点恢复（PRD 7.2）

### 7.1 快照存在哪

**双份**：

| 位置 | 谁写 | 用途 |
|---|---|---|
| 本地 `uni.storage`（`ev_learning_session_v1`） | `saveLocalSession()` | 快速恢复，离线可用 |
| 后端 `DailyLearning.lastLearningPosition` | `PUT /api/progress/daily-tasks/session` | 跨设备恢复 |

快照内容见 `utils/learning-session.ts` 的 `LearningSession` 接口：日期、阶段、两个队列与索引、已计数 ID、弹窗状态、统计、答案、是否在重试、补学模式、保存时间，**以及 userId**（防串号）。

### 7.2 什么时候存

`persistSession()` 在这些时机调用：

- 答完一题（`checkAnswer`）
- 进入重试（`prepareRetry`）
- 翻到下一题（`next` / `nextNewWord`）
- 弹出 10 词询问时
- 点 Continue / Finish 时
- 中途退出（`exitAndSave()`，三个流程页的 ✕ 按钮）

`phase === 'result'` 或 `idle` 时不存。

### 7.3 怎么恢复

```
重新进入 Review 页
   ↓
startReview(userId) → restoreSession(userId)
   ├─ 读本地快照
   ├─ 读服务端快照（getDailyTasks 时一起返回）
   ├─ pickNewerSession()：按 savedAt 取较新的
   ├─ isResumableSession()：校验「同一天 + userId 匹配 + 阶段可恢复」
   │    └─ 不通过 → reset(true) 清零昨日状态，开启新会话
   └─ 通过 → 恢复队列、索引、统计、弹窗态、phase
   ↓
redirectToPhase(phase) 跳到正确页面
```

**跨日失效**：快照的 `date` 是用户时区自然日。第二天进来日期不匹配，自动丢弃旧快照（并清零统计，避免昨天的计数触发今天的 10 词弹窗）。

---

## 八、首页统计口径（容易混淆）

首页有三个数字，含义不同：

| 位置 | 口径 | 后端字段 |
|---|---|---|
| Words Mastered 卡 | 真正掌握（`status=mastered`，7 天×3 次严格口径） | `masteredCount` |
| Current Stage `x / 1079 learned` | 该阶段已学习词（UserWord 有记录即算，含 learning） | `currentStage.learnedWords` |
| Today's Tasks → New Words | 今日新学数量 | `todayNewWords` |

`newWordsProgress` 进度条按 `todayNewWords / newWordsMinimum(5)` 算，**不是**按 Current Stage 算。

主按钮文案由 `reviewDueCount` 决定：有到期复习显示 `Start Review`，否则显示 `Start New Words`。

---

## 九、缓存与其他工具

### 9.1 词库缓存

`getCatalogWordsCached()`（utils/catalog-cache.ts）：

- 本地缓存 24 小时，key 是 `ev_catalog_words_v2`
- learning store 和 Vocabulary 页都用它，避免每次启动全量拉 1079 词
- **词表重建时必须升级 key**（之前 1448→1079 就从 v1 升到 v2），否则旧缓存反查不到新词义会静默丢词
- `logout()` 会清缓存

### 9.2 图片解析

`utils/nav.ts` 的 `resolveWordImage()` / `resolveWordHeroImage()`：

- apple/banana/cat/dog 用本地裁出的图
- 其余优先用后端 `imageUrl`（但当前都是空）
- 最后兜底返回 emoji `📚`

`isLocalImage()` 判断是本地路径还是 http URL，模板里据此选 `<image>` 还是 `<text>`。

### 9.3 Tab 图标

用 `apps/miniapp/scripts/gen-tab-icons.mjs` 生成（4x 超采样 + 降采样抗锯齿）。改图标样式时改脚本重新生成，不要手改 png。

---

## 十、常见坑

### 10.1 编译后样式失效

模板里**不要写内联复杂表达式**，例如：

```vue
<!-- 错误：编译后变量名对不上，宽度失效变成 100% -->
<view :style="{ width: (summary?.currentStage?.progressPercent ?? 0) + '%' }" />

<!-- 正确：在 script 里算好字符串 -->
<view :style="stageProgressStyle" />
```

这个坑导致过进度条显示满格。Daily Result 和 Progress 页都踩过。

### 10.2 页面跳转后状态不对

六个流程页都要调 `redirectToPhase(phase, 当前页路径)`。新增流程页时别忘了加这一步，否则断点恢复后可能停在错误页面。

### 10.3 登录时序

任何需要鉴权的接口调用前都要先 `await userStore.ensureUser()`。如果直接调，可能 401。

### 10.4 改了 shared 类型没生效

`packages/shared/src/index.ts` 是前后端共用的。改完要：

1. `pnpm typecheck`（确认两边都过）
2. 重启后端（它读的是编译后的类型）
3. 小程序重新编译

### 10.5 真机调不通接口

- 检查 `apps/miniapp/.env` 的 `VITE_API_BASE_URL` 是不是局域网 IP（不是 localhost）
- 手机和电脑同一 Wi-Fi
- 微信开发者工具勾选"不校验合法域名"
- 后端确实在跑且防火墙放行 3000

### 10.6 H5 只能冒烟

`pnpm dev:h5` 能启动，但 `rpx` 换算和微信真机不同，且 `wx.login` 不可用（会被 catch 吞掉）。**UI 还原度以微信开发者工具为准**。

---

## 十一、加一个新页面的步骤

1. 在 `src/pages/` 下建目录和 `index.vue`
2. 在 `src/pages.json` 的 `pages` 数组注册路径和样式（如果设 `navigationStyle: custom`，记得自己处理顶部间距）
3. 如果需要进 tabBar，在 `tabBar.list` 加一项并准备两张图标
4. 页面里：
   ```ts
   onMounted(async () => {
     const userId = await userStore.ensureUser()
     // 加载数据...
   })
   ```
5. 需要新接口就在 `src/api/` 加封装，类型加到 `packages/shared`
6. `pnpm type-check` + 微信开发者工具重新编译

---

## 十二、阅读顺序建议

想快速上手按这个顺序：

1. `src/pages.json`（5 分钟）— 知道有哪些页面
2. `src/api/request.ts`（10 分钟）— 知道前端怎么调后端
3. `src/stores/user.ts`（15 分钟）— 登录流程
4. `src/pages/home/index.vue`（20 分钟）— 最简单的完整页面
5. `src/stores/learning.ts`（40 分钟）— 核心状态机，分段读
6. `src/utils/learning-session.ts` + `src/utils/nav.ts`（20 分钟）— 断点恢复
7. 其余流程页按需查

不要一上来读 `learning.ts` 全文——先理解阶段流转和快照概念，再回头看实现会轻松很多。
