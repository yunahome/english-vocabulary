import type { WordWithSensesDto } from '@englis-vocabulary/shared'
import { getCatalogWords } from '@/api/catalog'

// v2：词表已全量重建（1448 → 1079），升级 key 让旧缓存自然失效
const CATALOG_CACHE_KEY = 'ev_catalog_words_v2'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface CatalogCache {
  savedAt: number
  words: WordWithSensesDto[]
}

function readCache(): WordWithSensesDto[] | null {
  try {
    const raw = uni.getStorageSync(CATALOG_CACHE_KEY) as string | undefined
    if (!raw) return null
    const parsed = JSON.parse(raw) as CatalogCache
    if (
      !Array.isArray(parsed.words) ||
      typeof parsed.savedAt !== 'number' ||
      Date.now() - parsed.savedAt > CACHE_TTL_MS
    ) {
      return null
    }
    return parsed.words
  } catch {
    return null
  }
}

function writeCache(words: WordWithSensesDto[]): void {
  try {
    const cache: CatalogCache = { savedAt: Date.now(), words }
    uni.setStorageSync(CATALOG_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // 缓存写入失败不影响主流程
  }
}

/** 全量词库：本地缓存优先，避免每次启动/每个页面都全量拉取 */
export async function getCatalogWordsCached(): Promise<WordWithSensesDto[]> {
  const cached = readCache()
  if (cached && cached.length > 0) return cached
  const words = await getCatalogWords()
  writeCache(words)
  return words
}

/** 主动刷新（词库变更后调用） */
export async function refreshCatalogWords(): Promise<WordWithSensesDto[]> {
  const words = await getCatalogWords()
  writeCache(words)
  return words
}

/** 退出登录时清理缓存，避免跨账号残留 */
export function clearCatalogCache(): void {
  try {
    uni.removeStorageSync(CATALOG_CACHE_KEY)
  } catch {
    /* 忽略 */
  }
}
