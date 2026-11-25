import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
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

    const next = await this.prisma.stage.findFirst({
      where: { sortOrder: { gt: current.stage.sortOrder } },
      orderBy: { sortOrder: 'asc' },
    })
    if (!next) throw new NotFoundException('已是最后一个阶段')

    const updated = await this.prisma.userStage.upsert({
      where: { userId_stageId: { userId, stageId: next.id } },
      create: {
        userId,
        stageId: next.id,
        status: 'unlocked',
        unlockedAt: new Date(),
      },
      update: { status: 'unlocked', unlockedAt: new Date() },
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
    await this.ensureUser(userId)
    const learningDate = this.parseDate(dateStr)

    // 当日汇总：upsert 保证幂等
    const learning = await this.prisma.dailyLearning.upsert({
      where: { userId_learningDate: { userId, learningDate } },
      create: { userId, learningDate },
      update: {},
    })

    // 若当天还没有任务，按必学词义生成最低 5 个新词任务
    const existingCount = await this.prisma.dailyTask.count({
      where: { userId, learningDate },
    })
    if (existingCount === 0) {
      const senses = await this.prisma.wordSense.findMany({
        orderBy: { sortOrder: 'asc' },
        take: DAILY_MINIMUM_NEW_WORDS,
      })
      for (const [index, sense] of senses.entries()) {
        await this.prisma.dailyTask.create({
          data: {
            userId,
            learningDate,
            wordSenseId: sense.id,
            taskType: 'new',
            sequence: index + 1,
            taskStatus: 'pending',
          },
        })
      }
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

  /** 完成一个每日任务，并同步当日汇总计数 */
  async completeDailyTask(
    userId: string,
    taskId: string,
    dateStr?: string,
  ): Promise<DailyTasksResultDto> {
    const task = await this.prisma.dailyTask.findUnique({ where: { id: taskId } })
    if (!task || task.userId !== userId) throw new NotFoundException('任务不存在')

    await this.prisma.dailyTask.update({
      where: { id: taskId },
      data: { taskStatus: 'completed', completedAt: new Date() },
    })

    const learningDate = this.parseDate(dateStr)
    const learning = await this.prisma.dailyLearning.findUnique({
      where: { userId_learningDate: { userId, learningDate } },
    })
    if (learning) {
      const completedCount = await this.prisma.dailyTask.count({
        where: { userId, learningDate, taskStatus: 'completed' },
      })
      await this.prisma.dailyLearning.update({
        where: { id: learning.id },
        data: {
          newWordCount: task.taskType === 'new' ? completedCount : learning.newWordCount,
          reviewWordCount:
            task.taskType === 'review' ? completedCount : learning.reviewWordCount,
          isDailyMinimumCompleted:
            task.taskType === 'new' && completedCount >= DAILY_MINIMUM_NEW_WORDS,
        },
      })
    }

    // 重新读取最新状态
    return this.getDailyTasks(userId, dateStr)
  }

  private parseDate(dateStr?: string): Date {
    const value = dateStr ?? new Date().toISOString().slice(0, 10)
    const date = new Date(`${value}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime())) throw new NotFoundException('日期格式无效，应为 YYYY-MM-DD')
    return date
  }

  private async ensureUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('用户不存在，请先创建用户')
  }
}
