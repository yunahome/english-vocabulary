/**
 * 前后端共享类型。
 * 这里只放类型定义，不包含运行时代码，因此前端（Vite）和后端（NestJS）
 * 都可以直接通过 `import type` 引用，不需要额外的构建步骤。
 */

export interface WordDto {
  id: string
  word: string
  phonetic: string | null
  meaning: string
  example: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateWordInput {
  word: string
  meaning: string
  phonetic?: string
  example?: string
}

export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

export interface HealthDto {
  status: 'ok'
  timestamp: string
}

// ===== 课程 =====
export interface StageDto {
  id: string
  name: string
  code: string
  sortOrder: number
  description: string | null
  isActive: boolean
  units?: UnitDto[]
}

export interface UnitDto {
  id: string
  stageId: string
  name: string
  sortOrder: number
  levels?: LevelDto[]
}

export interface LevelDto {
  id: string
  unitId: string
  name: string
  sortOrder: number
  isActive: boolean
}

// ===== 词汇 =====
export interface WordSenseDto {
  id: string
  wordId: string
  partOfSpeech: string
  definition: string
  englishDefinition: string | null
  example: string | null
  exampleTranslation: string | null
  sortOrder: number
}

export interface WordWithSensesDto {
  id: string
  word: string
  phonetic: string | null
  imageUrl: string | null
  pronunciationUrl: string | null
  senses: WordSenseDto[]
}

/** 关卡学习项：词义 + 所属单词的完整信息（供新词学习/复习页展示） */
export interface LevelLearningItemDto extends WordSenseDto {
  word: string
  phonetic: string | null
  imageUrl: string | null
  pronunciationUrl: string | null
}

// ===== 用户 =====
export interface UserDto {
  id: string
  openid: string | null
  nickname: string | null
  createdAt: string
}

export interface CreateUserInput {
  openid?: string
  nickname?: string
}

// ===== 学习提交 =====
export interface SubmitWritingInput {
  userId: string
  wordSenseId: string
  inputAnswer: string
  isCorrect: boolean
  isIndependent?: boolean
  attemptType?: 'scheduled' | 'immediate_retry'
  retryOfRecordId?: string
}

export interface WritingResultDto {
  recordId: string
  isCorrect: boolean
  isIndependent: boolean
  isValidMasteryAttempt: boolean
  correctStreak: number
  status: 'not_started' | 'learning' | 'mastered'
  mastered: boolean
  nextReviewAt: string | null
  reason: string
}

// ===== 掌握状态 =====
export interface UserWordDto {
  id: string
  userId: string
  wordSenseId: string
  status: string
  correctStreak: number
  firstLearnedAt: string | null
  lastTestedAt: string | null
  lastCorrectAt: string | null
  nextReviewAt: string | null
  masteredAt: string | null
  forgottenAt: string | null
}

// ===== 进度与每日任务 =====
export interface UserStageDto {
  id: string
  stageId: string
  status: string
  unlockedAt: string | null
  completedAt: string | null
}

export interface UserLevelDto {
  id: string
  levelId: string
  status: string
  completedAt: string | null
}

export interface DailyLearningDto {
  id: string
  learningDate: string
  newWordCount: number
  reviewWordCount: number
  masteredCount: number
  isDailyMinimumCompleted: boolean
  sessionStatus: string
  lastLearningPosition: string | null
}

export interface DailyTaskDto {
  id: string
  wordSenseId: string
  taskType: string
  taskStatus: string
  sequence: number
  retryCount: number
  completedAt: string | null
}

export interface DailyTasksResultDto {
  date: string
  learning: DailyLearningDto
  tasks: DailyTaskDto[]
}

// ===== 首页聚合 =====
export interface HomeSummaryDto {
  greeting: string
  subtitle: string
  dayStreak: number
  masteredCount: number
  currentStage: {
    id: string
    name: string
    stageNumber: number
    totalStages: number
    learnedWords: number
    totalWords: number
    progressPercent: number
  } | null
  reviewDueCount: number
  newWordsLocked: boolean
  newWordsMinimum: number
  date: string
}
