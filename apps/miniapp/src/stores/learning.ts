import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  DailyTaskDto,
  WordWithSensesDto,
  WritingResultDto,
} from '@englis-vocabulary/shared'
import { getCatalogWords } from '@/api/catalog'
import { getDueReviews, submitWriting } from '@/api/learning'
import { completeDailyTask, getDailyTasks, saveLearningSession } from '@/api/progress'
import {
  clearLocalSession,
  isResumableSession,
  loadLocalSession,
  pickNewerSession,
  saveLocalSession,
} from '@/utils/learning-session'
import type { LearningSession } from '@/utils/learning-session'
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

export const useLearningStore = defineStore('learning', () => {
  const userId = ref('')
  const phase = ref<LearningPhase>('idle')
  const queue = ref<StudyItem[]>([])
  const index = ref(0)
  const newQueue = ref<StudyItem[]>([])
  const newIndex = ref(0)
  const dailyTasks = ref<DailyTaskDto[]>([])
  /** 服务端保存的当日会话快照（PRD 7.2） */
  const remoteSessionRaw = ref<string | null>(null)
  const sessionDate = ref('')
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
  /** 按词义 ID 从课程词表反查学习项（用于只加载今日未完成的任务词） */
  async function buildItemsByIds(ids: string[]): Promise<StudyItem[]> {
    if (ids.length === 0) return []
    const words = await getCatalogWords()
    const lookup = new Map<
      string,
      { sense: WordWithSensesDto['senses'][number]; word: WordWithSensesDto }
    >()
    for (const word of words) {
      for (const sense of word.senses) lookup.set(sense.id, { sense, word })
    }
    return ids
      .map((id) => {
        const found = lookup.get(id)
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
          correctStreak: 0,
          status: 'not_started',
          isReview: false,
        } as StudyItem
      })
      .filter((item): item is StudyItem => item !== null)
  }

  /** 今日尚未完成的「新词」任务 ID：后端已排除历史学过与今日已完成的词 */
  function pendingNewWordIds(): string[] {
    return dailyTasks.value
      .filter((task) => task.taskType === 'new' && task.taskStatus !== 'completed')
      .map((task) => task.wordSenseId)
  }

  async function loadDailyTasks(id: string) {
    try {
      const result = await getDailyTasks()
      dailyTasks.value = result.tasks
      sessionDate.value = result.date
      remoteSessionRaw.value = result.learning.lastLearningPosition ?? null
    } catch {
      dailyTasks.value = []
    }
  }

  /** 序列化当前学习位置：本地立即写，服务端异步同步（失败不影响学习） */
  function persistSession(status = 'in_progress') {
    if (!sessionDate.value || phase.value === 'idle' || phase.value === 'result') return
    const snapshot: LearningSession = {
      date: sessionDate.value,
      phase: phase.value,
      queue: queue.value,
      index: index.value,
      newQueue: newQueue.value,
      newIndex: newIndex.value,
      countedNewWordIds: countedNewWordIds.value,
      pendingTenWordPrompt: pendingTenWordPrompt.value,
      showTenWordModal: showTenWordModal.value,
      stats: { ...stats.value },
      answer: answer.value,
      isRetryMode: isRetryMode.value,
      feedback: feedback.value,
      savedAt: new Date().toISOString(),
    }
    const raw = JSON.stringify(snapshot)
    saveLocalSession(snapshot)
    void saveLearningSession(raw, status).catch(() => {
      /* 服务端同步失败时本地快照仍可用于恢复 */
    })
  }

  /** PRD 7.2：恢复当日上次的学习位置。返回 null 表示无有效断点 */
  async function restoreSession(id: string): Promise<LearningPhase | null> {
    userId.value = id
    await loadDailyTasks(id)
    const picked = pickNewerSession(loadLocalSession(), remoteSessionRaw.value)
    if (!isResumableSession(picked, sessionDate.value)) return null
    const session = picked as LearningSession
    if (
      !Array.isArray(session.queue) ||
      !Array.isArray(session.newQueue) ||
      !Array.isArray(session.countedNewWordIds)
    ) {
      return null
    }
    queue.value = session.queue
    index.value = Math.min(Math.max(session.index ?? 0, 0), Math.max(session.queue.length - 1, 0))
    newQueue.value = session.newQueue
    newIndex.value = Math.min(
      Math.max(session.newIndex ?? 0, 0),
      Math.max(session.newQueue.length - 1, 0),
    )
    countedNewWordIds.value = session.countedNewWordIds
    pendingTenWordPrompt.value = Boolean(session.pendingTenWordPrompt)
    showTenWordModal.value = Boolean(session.showTenWordModal)
    stats.value = {
      newWords: session.stats?.newWords ?? 0,
      reviewed: session.stats?.reviewed ?? 0,
      correct: session.stats?.correct ?? 0,
      wrong: session.stats?.wrong ?? 0,
      newlyMastered: session.stats?.newlyMastered ?? 0,
    }
    answer.value = session.answer ?? ''
    isRetryMode.value = Boolean(session.isRetryMode)
    feedback.value = session.feedback ?? null
    phase.value = session.phase
    return phase.value
  }

  /** 中途退出：保存当前断点，下次进入继续（PRD 7.2） */
  function exitAndSave() {
    persistSession()
    phase.value = 'idle'
  }

  /** 结束/重置时清除断点（本地 + 服务端） */
  function clearSession() {
    clearLocalSession()
    remoteSessionRaw.value = null
    if (userId.value) {
      void saveLearningSession('', 'completed').catch(() => {
        /* 忽略 */
      })
    }
  }

  /** 进入复习页：有到期复习就复习，否则用关卡词做「首次独立拼写练习」。
   *  首次练习同样写入 WritingRecord，7 天后自然进入复习队列，数据闭环成立。 */
  async function startReview(id: string): Promise<LearningPhase> {
    if (phase.value === 'review' && queue.value.length > 0) return phase.value
    userId.value = id
    loading.value = true
    error.value = ''
    try {
      // PRD 7.2：优先恢复当天的学习断点
      const resumed = await restoreSession(id)
      if (resumed) return resumed
      const dueItems = await buildDueItems(id)
      // PRD 6.1：没有到期复习时直接进入新词学习，不再拿关卡词重复练一遍
      if (dueItems.length === 0) return await enterNewWords()
      queue.value = dueItems
      index.value = 0
      feedback.value = null
      answer.value = ''
      isRetryMode.value = false
      phase.value = 'review'
      persistSession()
      return phase.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载复习任务失败'
      phase.value = 'result'
      return phase.value
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
    persistSession()
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
    persistSession()
  }

  /** 当前题目结束，进入下一题；复习队列跑完后进入新词学习 */
  async function next(): Promise<LearningPhase> {
    answer.value = ''
    feedback.value = null
    isRetryMode.value = false
    if (index.value < queue.value.length - 1) {
      index.value += 1
      persistSession()
      return phase.value
    }
    return await enterNewWords()
  }

  /** 复习完成，加载关卡新词，进入 New Word 学习页 */
  async function enterNewWords(): Promise<LearningPhase> {
    loading.value = true
    try {
      await loadDailyTasks(userId.value)
      // 后端每日任务已排除历史学过与今日已完成的词，只学今天还没通过的新词
      const items = await buildItemsByIds(pendingNewWordIds())
      newQueue.value = items
      newIndex.value = 0
      phase.value = items.length > 0 ? 'new' : 'result'
      persistSession()
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
    persistSession()
  }

  /** Writing 页一题结束：满 10 词先弹窗询问，否则继续下一词或进入总结 */
  function nextNewWord(): LearningPhase {
    answer.value = ''
    feedback.value = null
    isRetryMode.value = false
    if (pendingTenWordPrompt.value) {
      pendingTenWordPrompt.value = false
      showTenWordModal.value = true
      persistSession() // 弹窗等待态也要恢复（PRD 5.3）
      return phase.value // 暂留 Writing 页，等用户选择
    }
    if (newIndex.value < newQueue.value.length - 1) {
      newIndex.value += 1
      phase.value = 'new'
    } else {
      phase.value = 'result'
    }
    persistSession()
    return phase.value
  }

  /** 弹窗选 Continue Learning：继续下一个词；队列耗尽则加载后续课程词 */
  async function continueLearning(): Promise<LearningPhase> {
    showTenWordModal.value = false
    if (newIndex.value < newQueue.value.length - 1) {
      newIndex.value += 1
      phase.value = 'new'
      persistSession()
      return phase.value
    }
    await loadDailyTasks(userId.value)
    const ids = pendingNewWordIds().filter(
      (id) => !countedNewWordIds.value.includes(id),
    )
    const more = await buildItemsByIds(ids)
    if (more.length === 0) {
      phase.value = 'result'
      return phase.value
    }
    newQueue.value = more
    newIndex.value = 0
    phase.value = 'new'
    persistSession()
    return phase.value
  }

  /** 弹窗选 Finish for Today，或用户在 5~9 词时主动结束 */
  function finishForToday(): LearningPhase {
    showTenWordModal.value = false
    pendingTenWordPrompt.value = false
    phase.value = 'result'
    clearSession()
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
    clearSession()
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
    restoreSession,
    persistSession,
    clearSession,
    exitAndSave,
    goResult,
    reset,
  }
})
