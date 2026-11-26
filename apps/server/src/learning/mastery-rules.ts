export const MASTERY_STREAK = 3
export const REVIEW_INTERVAL_DAYS = 7
export const REVIEW_INTERVAL_MS = REVIEW_INTERVAL_DAYS * 24 * 60 * 60 * 1000

export type LearningStatus = 'not_started' | 'learning' | 'mastered'

export interface MasterySnapshot {
  status: LearningStatus
  correctStreak: number
  lastCorrectAt: Date | null
  masteredAt: Date | null
  nextReviewAt: Date | null
}

export interface WritingAttemptInput {
  isCorrect: boolean
  isIndependent: boolean
  attemptType: 'scheduled' | 'immediate_retry'
  now: Date
  current: MasterySnapshot | null
}

export interface MasteryDecision {
  isValidMasteryAttempt: boolean
  correctStreak: number
  status: LearningStatus
  lastCorrectAt: Date | null
  masteredAt: Date | null
  nextReviewAt: Date | null
  clearForgotten: boolean
  reason: string
}

/**
 * 服务端唯一掌握规则入口。客户端提交的答案和 isCorrect 只代表本次作答，
 * 是否计入掌握、是否能更新复习时间全部由这里决定。
 */
export function evaluateWritingAttempt(input: WritingAttemptInput): MasteryDecision {
  const current = input.current ?? {
    status: 'not_started' as const,
    correctStreak: 0,
    lastCorrectAt: null,
    masteredAt: null,
    nextReviewAt: null,
  }
  const unchanged = {
    isValidMasteryAttempt: false,
    correctStreak: current.correctStreak,
    status: current.status,
    lastCorrectAt: current.lastCorrectAt,
    masteredAt: current.masteredAt,
    nextReviewAt: current.nextReviewAt,
    clearForgotten: false,
  }

  if (!input.isIndependent || input.attemptType !== 'scheduled') {
    return {
      ...unchanged,
      reason: '立即重试或非独立作答，不计入有效掌握次数',
    }
  }

  if (current.status === 'mastered') {
    return {
      ...unchanged,
      reason: '该词已达到掌握标准，不参与自动掌握测试',
    }
  }

  if (!input.isCorrect) {
    return {
      isValidMasteryAttempt: true,
      correctStreak: 0,
      status: 'learning',
      lastCorrectAt: null,
      masteredAt: null,
      nextReviewAt: input.now,
      clearForgotten: true,
      reason: '回答错误，连续正确次数已清零',
    }
  }

  if (
    current.lastCorrectAt &&
    input.now.getTime() - current.lastCorrectAt.getTime() < REVIEW_INTERVAL_MS
  ) {
    return {
      ...unchanged,
      reason: `距上次有效正确不足 ${REVIEW_INTERVAL_DAYS} 天，不计入掌握次数`,
    }
  }

  const correctStreak = current.correctStreak + 1
  if (correctStreak >= MASTERY_STREAK) {
    return {
      isValidMasteryAttempt: true,
      correctStreak,
      status: 'mastered',
      lastCorrectAt: input.now,
      masteredAt: current.masteredAt ?? input.now,
      nextReviewAt: null,
      clearForgotten: true,
      reason: `连续 ${correctStreak} 次有效正确，已掌握`,
    }
  }

  return {
    isValidMasteryAttempt: true,
    correctStreak,
    status: 'learning',
    lastCorrectAt: input.now,
    masteredAt: null,
    nextReviewAt: new Date(input.now.getTime() + REVIEW_INTERVAL_MS),
    clearForgotten: true,
    reason: `有效正确，连续 ${correctStreak}/${MASTERY_STREAK} 次`,
  }
}
