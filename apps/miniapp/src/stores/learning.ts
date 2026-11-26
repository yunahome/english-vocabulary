import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  DailyTaskDto,
  LevelLearningItemDto,
  WordWithSensesDto,
  WritingResultDto,
} from '@englis-vocabulary/shared'
import { getCatalogWords, getLevelWords, getStages } from '@/api/catalog'
import { getDueReviews, submitWriting } from '@/api/learning'
import { completeDailyTask, getDailyTasks } from '@/api/progress'
import { resolveWordHeroImage, resolveWordImage } from '@/utils/nav'

export interface StudyItem {
  wordSenseId: string
  word: string
  phonetic: string | null
  partOfSpeech: string
  definition: string
  englishDefinition: string | null
  example: string | null
  exampleTranslation: string | null
  pronunciationUrl: string | null
  /** 列表用的小图 */
  image: string
  /** 学习/复习页的大图 */
  heroImage: string
  correctStreak: number
  status: string
  isReview: boolean
}

export type LearningPhase = 'idle' | 'review' | 'new' | 'writing' | 'result'

/** PRD 5.2：每完成 10 个新词询问一次是否继续 */
export const TEN_WORD_PROMPT_INTERVAL = 10

export interface AnswerFeedback {
  correct: boolean
  isRetry: boolean
  expected: string
  result: WritingResultDto
}

function fromLevelItem(item: LevelLearningItemDto): StudyItem {
  return {
    wordSenseId: item.id,
    word: item.word,
    phonetic: item.phonetic,
    partOfSpeech: item.partOfSpeech,
    definition: item.definition,
    englishDefinition: item.englishDefinition,
    example: item.example,
    exampleTranslation: item.exampleTranslation,
    pronunciationUrl: item.pronunciationUrl,
    image: resolveWordImage(item.word, item.imageUrl),
    heroImage: resolveWordHeroImage(item.word, item.imageUrl),
    correctStreak: 0,
    status: 'not_started',
    isReview: false,
  }
}

export const useLearningStore = defineStore('learning', () => {
  const userId = ref('')
  const phase = ref<LearningPhase>('idle')
  const queue = ref<StudyItem[]>([])
  const index = ref(0)
  const newQueue = ref<StudyItem[]>([])
  const newIndex = ref(0)
  const dailyTasks = ref<DailyTaskDto[]>([])
  const loading = ref(false)
  const error = ref('')
  const answer = ref('')
  const feedback = ref<AnswerFeedback | null>(null)
  const isRetryMode = ref(false)
  /** 已完成过的新词 ID，避免同一词重试时重复计入每日新词数 */
  const countedNewWordIds = ref<string[]>([])
  /** 完成第 10/20/30... 个新词后，等用户点 Continue 时弹出询问 */
  const pendingTenWordPrompt = ref(false)
  const showTenWordModal = ref(false)
  const stats = ref({
    newWords: 0,
    reviewed: 0,
    correct: 0,
    wrong: 0,
    newlyMastered: 0,
  })

  const current = computed<StudyItem | null>(() => queue.value[index.value] ?? null)
  const newCurrent = computed<StudyItem | null>(() => newQueue.value[newIndex.value] ?? null)
  const total = computed(() => queue.value.length || 1)
  const progressLabel = computed(() => `${Math.min(index.value + 1, total.value)} / ${total.value}`)
  const progressPercent = computed(() =>
    total.value > 0 ? Math.round((index.value / total.value) * 100) : 0,
  )
  const newTotal = computed(() => newQueue.value.length || 1)
  const newProgressLabel = computed(
    () => `${Math.min(newIndex.value + 1, newTotal.value)} / ${newTotal.value}`,
  )
  const newProgressPercent = computed(() =>
    newTotal.value > 0 ? Math.round((newIndex.value / newTotal.value) * 100) : 0,
  )

  /** 把 wordSenseId 反查成可展示的词义（后端只给了 ID，用课程词表 join） */
  async function buildDueItems(id: string): Promise<StudyItem[]> {
    const [due, words] = await Promise.all([getDueReviews(), getCatalogWords()])
    if (due.length === 0) return []
    const lookup = new Map<
      string,
      { sense: WordWithSensesDto['senses'][number]; word: WordWithSensesDto }
    >()
    for (const word of words) {
      for (const sense of word.senses) lookup.set(sense.id, { sense, word })
    }
    return due
      .map((item) => {
        const found = lookup.get(item.wordSenseId)
        if (!found) return null
        const { sense, word } = found
        return {
          wordSenseId: sense.id,
          word: word.word,
          phonetic: word.phonetic,
          partOfSpeech: sense.partOfSpeech,
          definition: sense.definition,
          englishDefinition: sense.englishDefinition,
          example: sense.example,
          exampleTranslation: sense.exampleTranslation,
          pronunciationUrl: word.pronunciationUrl,
          image: resolveWordImage(word.word, word.imageUrl),
          heroImage: resolveWordHeroImage(word.word, word.imageUrl),
          correctStreak: item.correctStreak,
          status: item.status,
          isReview: true,
        } as StudyItem
      })
      .filter((item): item is StudyItem => item !== null)
  }

  /** 按课程顺序收集关卡词；excludeIds 用于「继续学习」时跳过已学过的词 */
  async function loadLevelItems(excludeIds: Set<string> = new Set()): Promise<StudyItem[]> {
    const stages = await getStages()
    const result: StudyItem[] = []
    for (const stage of stages) {
      for (const unit of stage.units ?? []) {
        for (const level of unit.levels ?? []) {
          const items = await getLevelWords(level.id)
          for (const item of items) {
            if (
              !excludeIds.has(item.id) &&
              !result.some((existing) => existing.wordSenseId === item.id)
            ) {
              result.push(fromLevelItem(item))
            }
          }
        }
      }
    }
    return result
  }

  async function loadDailyTasks(id: string) {
    try {
      const result = await getDailyTasks()
      dailyTasks.value = result.tasks
    } catch {
      dailyTasks.value = []
    }
  }

  /** 进入复习页：有到期复习就复习，否则用关卡词做「首次独立拼写练习」。
   *  首次练习同样写入 WritingRecord，7 天后自然进入复习队列，数据闭环成立。 */
  async function startReview(id: string) {
    if (phase.value === 'review' && queue.value.length > 0) return
    userId.value = id
    loading.value = true
    error.value = ''
    try {
      let items = await buildDueItems(id)
      if (items.length === 0) items = await loadLevelItems()
      queue.value = items
      index.value = 0
      feedback.value = null
      answer.value = ''
      isRetryMode.value = false
      phase.value = 'review'
      await loadDailyTasks(id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载复习任务失败'
    } finally {
      loading.value = false
    }
  }

  /** 提交一次拼写答案。答错后进入 Try Again（立即重试，不计入有效掌握次数） */
  async function checkAnswer(input: string): Promise<AnswerFeedback | null> {
    const item = current.value
    if (!item || !userId.value) return null
    const isRetry = isRetryMode.value

    const result = await submitWriting({
      wordSenseId: item.wordSenseId,
      inputAnswer: input,
      isIndependent: true,
      attemptType: isRetry ? 'immediate_retry' : 'scheduled',
    })
    const isCorrect = result.isCorrect

    if (isCorrect) {
      stats.value.correct += 1
      if (phase.value === 'review' && item.isReview) stats.value.reviewed += 1
      // PRD 5.3：同一个新词只计一次；答错后重试答对仍算首次完成该词
      if (
        phase.value === 'writing' &&
        !item.isReview &&
        !countedNewWordIds.value.includes(item.wordSenseId)
      ) {
        countedNewWordIds.value.push(item.wordSenseId)
        stats.value.newWords += 1
        if (stats.value.newWords % TEN_WORD_PROMPT_INTERVAL === 0) {
          pendingTenWordPrompt.value = true
        }
      }
      if (result.mastered && !isRetry) stats.value.newlyMastered += 1
      if (
        (phase.value === 'review' && item.isReview) ||
        (phase.value === 'writing' && !item.isReview)
      ) {
        await completeMatchingTask(item)
      }
    } else {
      stats.value.wrong += 1
    }

    const value: AnswerFeedback = { correct: isCorrect, isRetry, expected: item.word, result }
    feedback.value = value
    return value
  }

  /** 完成当前词对应的每日任务（新词任务） */
  async function completeMatchingTask(item: StudyItem) {
    const taskType = item.isReview ? 'review' : 'new'
    const task =
      dailyTasks.value.find(
        (t) =>
          t.wordSenseId === item.wordSenseId &&
          t.taskType === taskType &&
          t.taskStatus !== 'completed',
      ) ??
      dailyTasks.value.find(
        (t) => t.taskType === taskType && t.taskStatus !== 'completed',
      )
    if (!task) return
    try {
      const result = await completeDailyTask(task.id)
      dailyTasks.value = result.tasks
    } catch {
      // 任务计数失败不影响学习主流程
    }
  }

  /** 答错后：显示答案，用户学习后点 Try Again 重新独立输入 */
  function prepareRetry() {
    isRetryMode.value = true
    answer.value = ''
    feedback.value = null
  }

  /** 当前题目结束，进入下一题；复习队列跑完后进入新词学习 */
  async function next(): Promise<LearningPhase> {
    answer.value = ''
    feedback.value = null
    isRetryMode.value = false
    if (index.value < queue.value.length - 1) {
      index.value += 1
      return phase.value
    }
    return await enterNewWords()
  }

  /** 复习完成，加载关卡新词，进入 New Word 学习页 */
  async function enterNewWords(): Promise<LearningPhase> {
    loading.value = true
    try {
      const items = await loadLevelItems()
      newQueue.value = items
      newIndex.value = 0
      phase.value = items.length > 0 ? 'new' : 'result'
      return phase.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载新词失败'
      phase.value = 'result'
      return phase.value
    } finally {
      loading.value = false
    }
  }

  /** New Word 页点「I've Learned This Word」：进入该词的 Writing 拼写测试 */
  function learnCurrentWord() {
    const item = newCurrent.value
    if (!item) {
      phase.value = 'result'
      return
    }
    queue.value = [item]
    index.value = 0
    answer.value = ''
    feedback.value = null
    isRetryMode.value = false
    phase.value = 'writing'
  }

  /** Writing 页一题结束：满 10 词先弹窗询问，否则继续下一词或进入总结 */
  function nextNewWord(): LearningPhase {
    answer.value = ''
    feedback.value = null
    isRetryMode.value = false
    if (pendingTenWordPrompt.value) {
      pendingTenWordPrompt.value = false
      showTenWordModal.value = true
      return phase.value // 暂留 Writing 页，等用户选择
    }
    if (newIndex.value < newQueue.value.length - 1) {
      newIndex.value += 1
      phase.value = 'new'
    } else {
      phase.value = 'result'
    }
    return phase.value
  }

  /** 弹窗选 Continue Learning：继续下一个词；队列耗尽则加载后续课程词 */
  async function continueLearning(): Promise<LearningPhase> {
    showTenWordModal.value = false
    if (newIndex.value < newQueue.value.length - 1) {
      newIndex.value += 1
      phase.value = 'new'
      return phase.value
    }
    const more = await loadLevelItems(new Set(countedNewWordIds.value))
    if (more.length === 0) {
      phase.value = 'result'
      return phase.value
    }
    newQueue.value = more
    newIndex.value = 0
    phase.value = 'new'
    return phase.value
  }

  /** 弹窗选 Finish for Today，或用户在 5~9 词时主动结束 */
  function finishForToday(): LearningPhase {
    showTenWordModal.value = false
    pendingTenWordPrompt.value = false
    phase.value = 'result'
    return phase.value
  }

  function goResult() {
    finishForToday()
  }

  function reset() {
    phase.value = 'idle'
    queue.value = []
    newQueue.value = []
    index.value = 0
    newIndex.value = 0
    answer.value = ''
    feedback.value = null
    isRetryMode.value = false
    countedNewWordIds.value = []
    pendingTenWordPrompt.value = false
    showTenWordModal.value = false
    stats.value = { newWords: 0, reviewed: 0, correct: 0, wrong: 0, newlyMastered: 0 }
  }

  return {
    userId,
    phase,
    queue,
    index,
    newQueue,
    newIndex,
    dailyTasks,
    loading,
    error,
    answer,
    feedback,
    isRetryMode,
    countedNewWordIds,
    pendingTenWordPrompt,
    showTenWordModal,
    stats,
    current,
    newCurrent,
    total,
    progressLabel,
    progressPercent,
    newTotal,
    newProgressLabel,
    newProgressPercent,
    startReview,
    checkAnswer,
    prepareRetry,
    next,
    enterNewWords,
    learnCurrentWord,
    nextNewWord,
    continueLearning,
    finishForToday,
    goResult,
    reset,
  }
})
