import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import type { HomeSummaryDto } from '@englis-vocabulary/shared'
import {
  dateKeyInTimeZone,
  hourInTimeZone,
  parseDateKey,
  resolveTimeZone,
} from '../common/date-time'
import { countsTowardStreak } from '../progress/progress-rules'

const DAY_MS = 24 * 60 * 60 * 1000

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  /** 首页一次性聚合数据，避免多次请求 */
  async getSummary(userId: string): Promise<HomeSummaryDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })
    if (!user) throw new NotFoundException('用户不存在')

    const now = new Date()
    const timezone = resolveTimeZone(user.timezone)
    const todayKey = dateKeyInTimeZone(now, timezone)
    const today = parseDateKey(todayKey)

    // 掌握词数：status = mastered
    const masteredCount = await this.prisma.userWord.count({
      where: { userId, status: 'mastered' },
    })

    // 当前阶段：第一个未 completed 的 UserStage；全部完成则最后一个
    const userStages = await this.prisma.userStage.findMany({
      where: { userId },
      include: { stage: true },
      orderBy: { stage: { sortOrder: 'asc' } },
    })
    const current =
      userStages.find((item) => item.status !== 'completed') ??
      userStages[userStages.length - 1]

    let currentStage: HomeSummaryDto['currentStage'] = null
    if (current) {
      // 只统计 isRequired=true 的必学词义，与阶段解锁口径一致
      const totalWords = await this.prisma.stageWord.count({
        where: { stageId: current.stageId, isRequired: true },
      })
      const learnedSenseIds = await this.prisma.userWord.findMany({
        where: { userId, status: 'mastered' },
        select: { wordSenseId: true },
      })
      const stageSenseIds = await this.prisma.stageWord.findMany({
        where: { stageId: current.stageId, isRequired: true },
        select: { wordSenseId: true },
      })
      const learnedWords = stageSenseIds.filter((s) =>
        learnedSenseIds.some((l) => l.wordSenseId === s.wordSenseId),
      ).length
      const totalStages = await this.prisma.stage.count({ where: { isActive: true } })
      currentStage = {
        id: current.stageId,
        name: current.stage.name,
        stageNumber: current.stage.sortOrder,
        totalStages,
        learnedWords,
        totalWords,
        progressPercent:
          totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0,
      }
    }

    // 今日待复习数：nextReviewAt <= 现在 或 标记遗忘
    const reviewDueCount = await this.prisma.userWord.count({
      where: {
        userId,
        status: { not: 'mastered' },
        OR: [
          { nextReviewAt: { lte: now } },
          { forgottenAt: { not: null } },
        ],
      },
    })

    // 今日学习汇总（PRD：首页要体现今天学了什么）
    const todayLearning = await this.prisma.dailyLearning.findUnique({
      where: { userId_learningDate: { userId, learningDate: today } },
      select: { newWordCount: true, reviewWordCount: true, masteredCount: true },
    })
    const todayReviewTasks = await this.prisma.dailyTask.count({
      where: { userId, learningDate: today, taskType: 'review' },
    })
    // Day Streak：从今天（或昨天）往前数连续的 DailyLearning 记录
    const dayStreak = await this.calculateStreak(userId, today)

    const hour = hourInTimeZone(now, timezone)
    const greeting =
      hour < 12 ? 'Good morning!' : hour < 18 ? 'Good afternoon!' : 'Good evening!'

    return {
      greeting,
      subtitle: "Ready for today's English journey?",
      dayStreak,
      masteredCount,
      currentStage,
      reviewDueCount,
      newWordsLocked: reviewDueCount > 0,
      newWordsMinimum: 5,
      todayNewWords: todayLearning?.newWordCount ?? 0,
      todayReviews: todayLearning?.reviewWordCount ?? 0,
      todayReviewTasks,
      todayMastered: todayLearning?.masteredCount ?? 0,
      date: todayKey,
    }
  }

  private async calculateStreak(userId: string, today: Date): Promise<number> {
    const records = await this.prisma.dailyLearning.findMany({
      where: { userId },
      select: {
        learningDate: true,
        newWordCount: true,
        reviewWordCount: true,
        masteredCount: true,
      },
      orderBy: { learningDate: 'desc' },
    })
    // 只有真正完成过学习（新词/复习/新掌握）的日子才算连续天数
    const dates = new Set(
      records
        .filter((r) => countsTowardStreak(r))
        .map((r) => r.learningDate.getTime()),
    )
    if (dates.size === 0) return 0
    let cursor = today.getTime()

    // 今天没学习则从昨天开始算（连续天数还没断）
    if (!dates.has(cursor)) {
      cursor -= DAY_MS
      if (!dates.has(cursor)) return 0
    }

    let streak = 0
    while (dates.has(cursor)) {
      streak++
      cursor -= DAY_MS
    }
    return streak
  }
}
