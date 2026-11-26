/** 自定义导航栏布局信息。
 *  学习页用 navigationStyle: custom，需要自己避开状态栏和右上角胶囊按钮。 */
export interface NavMetrics {
  /** 状态栏高度，单位 px */
  statusBarHeight: number
  /** 导航栏内容高度，单位 px */
  contentHeight: number
  /** 右侧需要给胶囊按钮留出的宽度，单位 px */
  rightPadding: number
  /** 顶部总占位（状态栏 + 内容），单位 px */
  totalHeight: number
}

export function getNavMetrics(): NavMetrics {
  let statusBarHeight = 20
  let windowWidth = 375
  try {
    const sys = uni.getSystemInfoSync()
    statusBarHeight = sys.statusBarHeight || 20
    windowWidth = sys.windowWidth || 375
  } catch {
    // H5 等环境兜底
  }

  let rightPadding = 16
  try {
    const getter = (uni as unknown as {
      getMenuButtonBoundingClientRect?: () => { left: number; width: number }
    }).getMenuButtonBoundingClientRect
    const menu = getter?.()
    if (menu && menu.left > 0) {
      // 自定义按钮放在胶囊左侧，避免被胶囊盖住
      rightPadding = Math.max(16, Math.round(windowWidth - menu.left + 10))
    }
  } catch {
    // 非微信小程序环境没有胶囊
  }

  const contentHeight = 44
  return {
    statusBarHeight,
    contentHeight,
    rightPadding,
    totalHeight: statusBarHeight + contentHeight,
  }
}

/** 学习会话阶段 → 页面路径，用于断点恢复后跳回正确页面 */
export const LEARNING_PAGE: Record<string, string> = {
  review: '/pages/review/index',
  new: '/pages/word-learning/index',
  writing: '/pages/writing/index',
  result: '/pages/daily-result/index',
}

/** 恢复断点后，如果当前页与阶段不匹配则重定向；返回是否已重定向 */
export function redirectToPhase(phase: string, currentPage: string): boolean {
  const target = LEARNING_PAGE[phase]
  if (!target || target === currentPage) return false
  uni.redirectTo({ url: target })
  return true
}

/** 按单词名解析展示图片：优先用从 UI 图裁出的本地素材 */
const WORD_IMAGES: Record<string, string> = {
  apple: '/static/assets/word-apple.jpg',
  banana: '/static/assets/word-banana.jpg',
  cat: '/static/assets/word-cat.jpg',
  dog: '/static/assets/word-dog.jpg',
}

export function resolveWordImage(word: string, fallback?: string | null): string {
  const key = (word || '').toLowerCase()
  if (WORD_IMAGES[key]) return WORD_IMAGES[key]
  if (fallback && /^https?:\/\//.test(fallback)) return fallback
  return '📚'
}

/** 大图（学习/复习页）：apple 用高清苹果图，其余用对应的小图放大 */
export function resolveWordHeroImage(word: string, fallback?: string | null): string {
  const key = (word || '').toLowerCase()
  if (key === 'apple') return '/static/assets/apple.jpg'
  return resolveWordImage(word, fallback)
}

export function isLocalImage(src: string): boolean {
  return src.startsWith('/') || src.startsWith('http')
}
