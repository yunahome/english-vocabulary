import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import type { HomeSummaryDto } from '@englis-vocabulary/shared'

const DAY_MS = 24 * 60 * 60 * 1000

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  /** 首页一次性聚合数据，避免多次请求 */
  async getSummary(userId: string): Promise<HomeSummaryDto> {
    const now = new Date()
    const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`)

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
      const totalWords = await this.prisma.stageWord.count({
        where: { stageId: current.stageId },
      })
      // 已掌握该阶段必学词义数
      const learnedSenseIds = await this.prisma.userWord.findMany({
        where: { userId, status: 'mastered' },
        select: { wordSenseId: true },
      })
      const stageSenseIds = await this.prisma.stageWord.findMany({
        where: { stageId: current.stageId },
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
        OR: [
          { nextReviewAt: { lte: now } },
          { forgottenAt: { not: null } },
        ],
      },
    })

    // Day Streak：从今天（或昨天）往前数连续的 DailyLearning 记录
    const dayStreak = await this.calculateStreak(userId, today)

    const hour = now.getHours()
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
      date: today.toISOString().slice(0, 10),
    }
  }

  private async calculateStreak(userId: string, today: Date): Promise<number> {
    const records = await this.prisma.dailyLearning.findMany({
      where: { userId },
      select: { learningDate: true },
      orderBy: { learningDate: 'desc' },
    })
    if (records.length === 0) return 0

    const dates = new Set(records.map((r) => r.learningDate.getTime()))
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
