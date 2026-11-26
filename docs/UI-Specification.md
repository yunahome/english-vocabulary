# UI Specification

本项目按用户提供的 5 张 UI 设计稿做 1:1 还原。设计稿覆盖：Home + Review、New Word、Writing、Daily Result + Vocabulary。

## 视觉约定

| 项 | 值 |
| --- | --- |
| 页面背景 | `#fffaf2` 奶油白 |
| 主绿 | `#3d9b6c`（按钮、进度条、选中态） |
| 浅绿 | `#e7f4ea` / `#eaf6ec`（提示卡、图片底） |
| 深文字 | `#1f2d24` |
| 次要文字 | `#8a9a90` / `#6b7a70` |
| 强调橙 | `#f0a500` / `#e8932c`（New Words、Example） |
| 卡片 | 白色、24~28rpx 圆角、`0 6rpx 20rpx rgba(60,80,60,.05)` 阴影 |
| 主按钮 | 全宽、绿色、`999rpx` 胶囊圆角 |
| 字体 | 系统字体，标题 700~800 字重 |

尺寸以 `750rpx` 设计稿为基准。Home、学习流程页与 Vocabulary / Progress / Profile 使用 `navigationStyle: custom` 自绘导航栏，页面顶部按 `statusBarHeight` 留白，并给右上角微信胶囊按钮留出空间。

## 底部 TabBar（原生）

使用微信小程序原生 `tabBar`，位置和安全区由微信容器控制，`pages.json` 保持 `tabBar.custom = false`。

| 项 | 值 |
| --- | --- |
| 背景 | 白色 |
| 选中色 | `#30ba6e` |
| 未选中色 | `#9c9ea7` |
| 图标 | 实心风格 81×81 PNG；由 `scripts/gen-tab-icons.mjs` 生成 |
| 文字 | `26rpx`，未选中 `#9c9ea7` / 500，选中 `#30ba6e` / 700 |

## 页面清单

### 1. Home（Tab）
顶部问候语 + 太阳 + 右侧头像；整块吉祥物 banner（老鼠抱书 + "Let's learn something new!" 气泡 + 星星 + 草地）；Day Streak / Words Mastered 双卡；Current Stage 卡（书本图标、阶段名、`Stage x of 5`、`x / y words`、进度条）；Today's Tasks（Review / New Words 两张卡，`🔒 Locked` 与 `Finish review first` 由复习优先级决定）；Start Review 主按钮；底部草地；4 Tab。

数据来自 `GET /api/home/summary`，`onShow` 时刷新，保证学完返回后统计即时更新。

### 2. Review（流程页）
自定义导航（‹ / Review / ✕）；浅绿 Review Progress 卡（进度 + remaining）；`What is this word?` + 副标题；浅绿方块内的苹果大图；中文释义；居中的浅绿提示胶囊；输入框；Check Answer；💡 提示；底部老鼠插画。答错显示答案 + 音标 + 释义，点 Try Again 独立重输（`immediate_retry`）。

### 3. New Word（流程页）
自定义导航（‹ / New Word / `Word x of y` / ✕）；Learning Progress；大苹果图 + 星星；单词 + 发音按钮 + 音标；绿色 `noun · 名词` 胶囊；MEANING / Example / Remember 三张卡；底部老鼠抱苹果插画；`I've Learned This Word` 主按钮；脚注。

### 4. Writing（流程页）
自定义导航（‹ / Writing / ✕）；进度数字与进度条；浅绿提示卡；大号中文词；输入框；Submit；正误反馈；底部老鼠抱铅笔插画。

### 5. Daily Result（流程页）
顶部庆祝插画（彩带 + 老鼠 + Great Job 缎带）；New Words / Reviewed / New Mastered 三卡；Your Progress 与 Tomorrow's Preview 两栏；`Back to Home` 主按钮。明日数据为动态预估值。

### 6. Vocabulary（Tab）
自定义导航（Vocabulary / 🔍，顶级 Tab 页无返回箭头）；可展开搜索框；All / Learning / Review Due / Mastered 筛选胶囊；词卡（小图 + 单词 + 音标 + 状态徽章 + 下次复习/到期文案 + ›）；点击弹出详情，已掌握词提供 `I Forgot This Word`。

### 7. Progress（Tab）
当前阶段渐变绿卡（阶段名、进度、`x / y words mastered`）；Mastered / Learning / Day Streak 三格统计；五阶段解锁路径（当前阶段高亮，其余锁定/完成态）。

### 8. Profile（Tab）
用户卡（头像、昵称、ID、当前阶段）；四格统计；Today 概览；学习提醒 / 时区 / 关于等设置占位；版本号。

## 素材清单

`apps/miniapp/src/static/assets/` 下均为从 UI 设计稿裁出的位图，自带奶油色背景：

| 文件 | 用途 |
| --- | --- |
| `home-banner.jpg` | 首页整块吉祥物 banner |
| `apple.jpg` | Review 页浅绿方块内的苹果 |
| `apple-large.jpg` | New Word 页大苹果 |
| `word-apple.jpg` / `word-banana.jpg` / `word-cat.jpg` / `word-dog.jpg` | 词库列表小图 |
| `review-mascot.jpg` | Review 页底部老鼠 + 草地 |
| `newword-mascot.jpg` | New Word 页底部老鼠抱苹果 + 气泡 |
| `writing-mascot.jpg` | Writing 页底部老鼠抱铅笔 + 气泡 |
| `result-header.jpg` | Daily Result 顶部彩带 + 老鼠 + 缎带 |

`static/tab-*.png` 为 8 个 Tab 图标（实心风格，由 `scripts/gen-tab-icons.mjs` 生成：4x 超采样绘制后降采样，边缘抗锯齿）。

## 已知差异与后续替换

- **插画是位图**：从设计稿裁切，含固定文字（如气泡 "Let's learn something new!"），不可编辑；换高清素材需重新切图或提供源文件。
- **发音音频缺失**：`pronunciationUrl` 为空，点击扬声器提示「发音素材待接入」；接入真实音频后播放器即可生效。
- **非 apple 词的大图**：复用词库小图放大或 emoji 占位，视觉精度低于设计稿的 3D 苹果。
- **H5 与真机差异**：uni-app H5 的 `rpx` 换算与微信真机不同，Chrome 无头截图会出现整体横向裁切，属工具假象；**还原度以微信开发者工具为准**。
- **首页数据为真实值**：新用户初始为 0（设计稿为示例数据 7 days / 128 / 68 of 100），随学习进度增长。
