import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import {
  dateKeyInTimeZone,
  parseDateKey,
  resolveTimeZone,
} from '../common/date-time'
import type {
  DailyTasksResultDto,
  UserLevelDto,
  UserStageDto,
} from '@englis-vocabulary/shared'

/** 每日最低新词任务数（来自 step1.md：每天最低 5 个新词） */
const DAILY_MINIMUM_NEW_WORDS = 5

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  /** 初始化/同步用户阶段进度：首个阶段 unlocked，其余 locked */
  async initUserStages(userId: string): Promise<UserStageDto[]> {
    await this.ensureUser(userId)
    const stages = await this.prisma.stage.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    for (const [index, stage] of stages.entries()) {
      await this.prisma.userStage.upsert({
        where: { userId_stageId: { userId, stageId: stage.id } },
        create: {
          userId,
          stageId: stage.id,
          status: index === 0 ? 'unlocked' : 'locked',
          unlockedAt: index === 0 ? new Date() : null,
        },
        update: {},
      })
    }
    const items = await this.prisma.userStage.findMany({
      where: { userId },
      include: { stage: true },
      orderBy: { stage: { sortOrder: 'asc' } },
    })
    return items.map(
      (item): UserStageDto => ({
        id: item.id,
        stageId: item.stageId,
        status: item.status,
        unlockedAt: item.unlockedAt?.toISOString() ?? null,
        completedAt: item.completedAt?.toISOString() ?? null,
      }),
    )
  }

  /** 查询用户阶段进度 */
  async getUserStages(userId: string): Promise<UserStageDto[]> {
    const items = await this.prisma.userStage.findMany({
      where: { userId },
      include: { stage: true },
      orderBy: { stage: { sortOrder: 'asc' } },
    })
    return items.map((item) => ({
      id: item.id,
      stageId: item.stageId,
      status: item.status,
      unlockedAt: item.unlockedAt?.toISOString() ?? null,
      completedAt: item.completedAt?.toISOString() ?? null,
    }))
  }

  /** 解锁下一阶段（阶段解锁规则由后端判断） */
  async unlockNextStage(userId: string, stageId: string): Promise<UserStageDto> {
    const current = await this.prisma.userStage.findUnique({
      where: { userId_stageId: { userId, stageId } },
      include: { stage: true },
    })
    if (!current) throw new NotFoundException('用户阶段进度不存在')
    if (current.status !== 'unlocked') {
      throw new BadRequestException('当前阶段尚未解锁')
    }

    const [requiredWords, masteredWords] = await Promise.all([
      this.prisma.stageWord.findMany({
        where: { stageId, isRequired: true },
        select: { wordSenseId: true },
      }),
      this.prisma.userWord.findMany({
        where: { userId, status: 'mastered' },
        select: { wordSenseId: true },
      }),
    ])
    if (requiredWords.length === 0) {
      throw new BadRequestException('当前阶段没有配置必学词，不能解锁下一阶段')
    }
    const masteredIds = new Set(masteredWords.map((item) => item.wordSenseId))
    const incompleteCount = requiredWords.filter(
      (item) => !masteredIds.has(item.wordSenseId),
    ).length
    if (incompleteCount > 0) {
      throw new BadRequestException(
        `当前阶段还有 ${incompleteCount} 个必学词义未掌握，不能解锁下一阶段`,
      )
    }

    const next = await this.prisma.stage.findFirst({
      where: { sortOrder: { gt: current.stage.sortOrder } },
      orderBy: { sortOrder: 'asc' },
    })
    if (!next) throw new NotFoundException('已是最后一个阶段')

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.userStage.update({
        where: { id: current.id },
        data: { status: 'completed', completedAt: new Date() },
      })
      return tx.userStage.upsert({
        where: { userId_stageId: { userId, stageId: next.id } },
        create: {
          userId,
          stageId: next.id,
          status: 'unlocked',
          unlockedAt: new Date(),
        },
        update: { status: 'unlocked', unlockedAt: new Date() },
      })
    })
    return {
      id: updated.id,
      stageId: updated.stageId,
      status: updated.status,
      unlockedAt: updated.unlockedAt?.toISOString() ?? null,
      completedAt: updated.completedAt?.toISOString() ?? null,
    }
  }

  /** 用户关卡进度 */
  async getUserLevels(userId: string): Promise<UserLevelDto[]> {
    const items = await this.prisma.userLevel.findMany({
      where: { userId },
      include: { level: true },
      orderBy: { level: { sortOrder: 'asc' } },
    })
    return items.map((item) => ({
      id: item.id,
      levelId: item.levelId,
      status: item.status,
      completedAt: item.completedAt?.toISOString() ?? null,
    }))
  }

  /** 标记关卡完成，并解锁同一 Unit 的下一关 */
  async completeLevel(userId: string, levelId: string): Promise<UserLevelDto> {
    const level = await this.prisma.level.findUnique({ where: { id: levelId } })
    if (!level) throw new NotFoundException('关卡不存在')

    const done = await this.prisma.userLevel.upsert({
      where: { userId_levelId: { userId, levelId } },
      create: { userId, levelId, status: 'completed', completedAt: new Date() },
      update: { status: 'completed', completedAt: new Date() },
    })

    const nextLevel = await this.prisma.level.findFirst({
      where: { unitId: level.unitId, sortOrder: { gt: level.sortOrder } },
      orderBy: { sortOrder: 'asc' },
    })
    if (nextLevel) {
      await this.prisma.userLevel.upsert({
        where: { userId_levelId: { userId, levelId: nextLevel.id } },
        create: { userId, levelId: nextLevel.id, status: 'available' },
        update: { status: 'available' },
      })
    }
    return {
      id: done.id,
      levelId: done.levelId,
      status: done.status,
      completedAt: done.completedAt?.toISOString() ?? null,
    }
  }

  /** 获取/生成当日任务。已存在则直接返回（唯一约束保证不重复生成） */
  async getDailyTasks(userId: string, dateStr?: string): Promise<DailyTasksResultDto> {
    const user = await this.ensureUser(userId)
    const learningDate = this.parseDate(
      dateStr ?? dateKeyInTimeZone(new Date(), user.timezone),
    )

    // 当日汇总：upsert 保证幂等
    const learning = await this.prisma.dailyLearning.upsert({
      where: { userId_learningDate: { userId, learningDate } },
      create: { userId, learningDate },
      update: {},
    })

    const dueWords = await this.prisma.userWord.findMany({
      where: {
        userId,
        status: { not: 'mastered' },
        OR: [{ nextReviewAt: { lte: new Date() } }, { forgottenAt: { not: null } }],
      },
      orderBy: { nextReviewAt: 'asc' },
    })
    for (const [index, due] of dueWords.entries()) {
      await this.prisma.dailyTask.upsert({
        where: {
          userId_learningDate_wordSenseId_taskType: {
            userId,
            learningDate,
            wordSenseId: due.wordSenseId,
            taskType: 'review',
          },
        },
        create: {
          userId,
          learningDate,
          wordSenseId: due.wordSenseId,
          taskType: 'review',
          sequence: index + 1,
          taskStatus: 'pending',
        },
        update: {},
      })
    }

    const userStages = await this.prisma.userStage.findMany({
      where: { userId },
      include: { stage: true },
      orderBy: { stage: { sortOrder: 'asc' } },
    })
    const current = userStages.find((s) => s.status !== 'completed') ?? userStages[0]
    const learned = await this.prisma.userWord.findMany({
      where: { userId },
      select: { wordSenseId: true },
    })
    const learnedIds = new Set(learned.map((item) => item.wordSenseId))

    let senseIds: string[] = []
    if (current) {
      const stageWords = await this.prisma.stageWord.findMany({
        where: { stageId: current.stageId, isRequired: true },
        orderBy: { sortOrder: 'asc' },
      })
      // PRD 5.4：每日新词没有固定上限，5 个只是最低要求。
      // 全部未学必学词都生成任务，用户每 10 个词选择是否继续时才有词可学。
      senseIds = stageWords
        .map((item) => item.wordSenseId)
        .filter((id) => !learnedIds.has(id))
    }
    if (senseIds.length === 0) {
      const fallback = await this.prisma.wordSense.findMany({
        where: { id: { notIn: Array.from(learnedIds) } },
        orderBy: { sortOrder: 'asc' },
        take: DAILY_MINIMUM_NEW_WORDS,
      })
      senseIds = fallback.map((item) => item.id)
    }

    for (const [index, wordSenseId] of senseIds.entries()) {
      await this.prisma.dailyTask.upsert({
        where: {
          userId_learningDate_wordSenseId_taskType: {
            userId,
            learningDate,
            wordSenseId,
            taskType: 'new',
          },
        },
        create: {
          userId,
          learningDate,
          wordSenseId,
          taskType: 'new',
          sequence: dueWords.length + index + 1,
          taskStatus: 'pending',
        },
        update: {},
      })
    }

    const tasks = await this.prisma.dailyTask.findMany({
      where: { userId, learningDate },
      orderBy: { sequence: 'asc' },
    })

    return {
      date: learningDate.toISOString().slice(0, 10),
      learning: {
        id: learning.id,
        learningDate: learning.learningDate.toISOString().slice(0, 10),
        newWordCount: learning.newWordCount,
        reviewWordCount: learning.reviewWordCount,
        masteredCount: learning.masteredCount,
        isDailyMinimumCompleted: learning.isDailyMinimumCompleted,
        sessionStatus: learning.sessionStatus,
        lastLearningPosition: learning.lastLearningPosition,
      },
      tasks: tasks.map((task) => ({
        id: task.id,
        wordSenseId: task.wordSenseId,
        taskType: task.taskType,
        taskStatus: task.taskStatus,
        sequence: task.sequence,
        retryCount: task.retryCount,
        completedAt: task.completedAt?.toISOString() ?? null,
      })),
    }
  }

  /** PRD 7.2：保存学习断点。session 为客户端序列化的位置快照（含阶段/词/任务/弹窗态） */
  async saveSession(
    userId: string,
    session: string,
    status = 'in_progress',
    dateStr?: string,
  ): Promise<DailyTasksResultDto> {
    const user = await this.ensureUser(userId)
    const learningDate = this.parseDate(
      dateStr ?? dateKeyInTimeZone(new Date(), user.timezone),
    )
    await this.prisma.dailyLearning.upsert({
      where: { userId_learningDate: { userId, learningDate } },
      create: {
        userId,
        learningDate,
        sessionStatus: status,
        lastLearningPosition: session,
      },
      update: { sessionStatus: status, lastLearningPosition: session },
    })
    return this.getDailyTasks(userId, learningDate.toISOString().slice(0, 10))
  }

  /** 完成一个每日任务，并同步当日汇总计数 */
  async completeDailyTask(
    userId: string,
    taskId: string,
    dateStr?: string,
  ): Promise<DailyTasksResultDto> {
    await this.ensureUser(userId)
    const task = await this.prisma.dailyTask.findUnique({ where: { id: taskId } })
    if (!task || task.userId !== userId) throw new NotFoundException('任务不存在')

    if (task.taskType === 'new') {
      const pendingReviewCount = await this.prisma.dailyTask.count({
        where: {
          userId,
          learningDate: task.learningDate,
          taskType: 'review',
          taskStatus: { not: 'completed' },
        },
      })
      if (pendingReviewCount > 0) {
        throw new BadRequestException('请先完成今日全部到期复习，再完成新词任务')
      }
    }

    await this.prisma.dailyTask.update({
      where: { id: taskId },
      data: { taskStatus: 'completed', completedAt: new Date() },
    })

    const learningDate = task.learningDate
    const learning = await this.prisma.dailyLearning.findUnique({
      where: { userId_learningDate: { userId, learningDate } },
    })
    if (learning) {
      const [newWordCount, reviewWordCount] = await Promise.all([
        this.prisma.dailyTask.count({
          where: {
            userId,
            learningDate,
            taskType: 'new',
            taskStatus: 'completed',
          },
        }),
        this.prisma.dailyTask.count({
          where: {
            userId,
            learningDate,
            taskType: 'review',
            taskStatus: 'completed',
          },
        }),
      ])
      await this.prisma.dailyLearning.update({
        where: { id: learning.id },
        data: {
          newWordCount,
          reviewWordCount,
          isDailyMinimumCompleted:
            newWordCount >= DAILY_MINIMUM_NEW_WORDS,
        },
      })
    }

    // 重新读取最新状态
    return this.getDailyTasks(userId, learningDate.toISOString().slice(0, 10))
  }

  private parseDate(dateStr?: string): Date {
    try {
      return parseDateKey(dateStr ?? dateKeyInTimeZone(new Date(), 'Asia/Shanghai'))
    } catch {
      throw new BadRequestException('日期格式无效，应为 YYYY-MM-DD')
    }
  }

  private async ensureUser(userId: string): Promise<{ timezone: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('用户不存在，请先创建用户')
    return { timezone: resolveTimeZone(user.timezone) }
  }
}
