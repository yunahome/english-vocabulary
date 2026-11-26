import type { LearningPhase } from '@/stores/learning'
import type { StudyItem } from '@/stores/learning'
import type { AnswerFeedback } from '@/stores/learning'

const SESSION_KEY = 'ev_learning_session_v1'

export interface LearningStats {
  newWords: number
  reviewed: number
  correct: number
  wrong: number
  newlyMastered: number
}

/** PRD 7.2：学习断点快照。日期用用户时区自然日，跨日自动失效。 */
export interface LearningSession {
  date: string
  phase: LearningPhase
  queue: StudyItem[]
  index: number
  newQueue: StudyItem[]
  newIndex: number
  countedNewWordIds: string[]
  pendingTenWordPrompt: boolean
  showTenWordModal: boolean
  stats: LearningStats
  answer: string
  isRetryMode: boolean
  feedback: AnswerFeedback | null
  savedAt: string
}

export function saveLocalSession(session: LearningSession): void {
  try {
    uni.setStorageSync(SESSION_KEY, JSON.stringify(session))
  } catch {
    // 本地存储失败不影响学习主流程
  }
}

export function loadLocalSession(): LearningSession | null {
  try {
    const raw = uni.getStorageSync(SESSION_KEY) as string | undefined
    if (!raw) return null
    const parsed = JSON.parse(raw) as LearningSession
    return parsed && parsed.date && parsed.phase ? parsed : null
  } catch {
    return null
  }
}

export function clearLocalSession(): void {
  try {
    uni.removeStorageSync(SESSION_KEY)
  } catch {
    /* 忽略 */
  }
}

/** 本地会话与服务端 lastLearningPosition 都可用时，优先取较新的一个 */
export function pickNewerSession(
  local: LearningSession | null,
  remoteRaw: string | null | undefined,
): LearningSession | null {
  if (!remoteRaw) return local
  try {
    const remote = JSON.parse(remoteRaw) as LearningSession
    if (!remote?.date || !remote?.phase) return local
    if (!local) return remote
    return (remote.savedAt ?? '') >= (local.savedAt ?? '') ? remote : local
  } catch {
    return local
  }
}

/** 同一天、且处于可恢复的学习阶段 */
export function isResumableSession(session: LearningSession | null, today: string): boolean {
  if (!session || session.date !== today) return false
  return session.phase === 'review' || session.phase === 'new' || session.phase === 'writing'
}
