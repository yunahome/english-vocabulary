/** 每日最低新词任务数（PRD DAY-001：当前阶段仍有可学新词时） */
export const DAILY_MINIMUM_NEW_WORDS = 5

/** 新词任务按批生成，避免一次写入全阶段词表 */
export const NEW_WORD_BATCH_SIZE = 10

/**
 * 仅在当前没有未完成的新词任务时，追加下一批未学必学词。
 * 不从其它阶段补词；本阶段没有剩余新词时返回空数组。
 */
export function selectNextNewWordBatch(params: {
  stageSenseIdsInOrder: string[]
  learnedSenseIds: Set<string>
  existingNewSenseIds: Set<string>
  pendingNewCount: number
  batchSize?: number
}): string[] {
  if (params.pendingNewCount > 0) return []
  const size = params.batchSize ?? NEW_WORD_BATCH_SIZE
  return params.stageSenseIdsInOrder
    .filter(
      (id) => !params.learnedSenseIds.has(id) && !params.existingNewSenseIds.has(id),
    )
    .slice(0, size)
}

/** 只有真正完成过新词 / 复习 / 新掌握，才计入连续学习天数 */
export function countsTowardStreak(learning: {
  newWordCount: number
  reviewWordCount: number
  masteredCount: number
}): boolean {
  return (
    learning.newWordCount > 0 ||
    learning.reviewWordCount > 0 ||
    learning.masteredCount > 0
  )
}
