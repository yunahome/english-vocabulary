import { Prisma, PrismaClient } from '@prisma/client'
import { dateKeyInTimeZone, parseDateKey, resolveTimeZone } from '../common/date-time'

type TxClient = Prisma.TransactionClient

/**
 * 在事务内把「当日新掌握数」+1。
 * 仅在词义第一次达到 mastered（或从遗忘回退后重新掌握）时调用。
 */
export async function incrementTodayMastered(
  tx: TxClient,
  userId: string,
  now: Date,
  timeZone?: string | null,
): Promise<void> {
  const learningDate = parseDateKey(
    dateKeyInTimeZone(now, resolveTimeZone(timeZone)),
  )
  await tx.dailyLearning.upsert({
    where: { userId_learningDate: { userId, learningDate } },
    create: { userId, learningDate, masteredCount: 1 },
    update: { masteredCount: { increment: 1 } },
  })
}

/**
 * 掌握某词义后，检查它所属的全部关卡是否满足完成条件（一个词义可能出现在多个关卡）。
 */
export async function completeLevelsForSense(
  tx: Prisma.TransactionClient | PrismaClient,
  userId: string,
  wordSenseId: string,
  at: Date,
): Promise<number> {
  const links = await tx.levelWord.findMany({
    where: { wordSenseId },
    select: { levelId: true },
  })
  let done = 0
  for (const link of links) {
    if (await completeLevelIfReady(tx, userId, link.levelId, at)) done++
  }
  return done
}

/**
 * 检查某关卡的必学词义是否全部掌握，是则标记完成并解锁同一 Unit 下一关（幂等）。
 * 返回本次是否完成了关卡。
 */
export async function completeLevelIfReady(
  tx: Prisma.TransactionClient | PrismaClient,
  userId: string,
  levelId: string,
  at: Date,
): Promise<boolean> {
  const senseIds = (
    await tx.levelWord.findMany({
      where: { levelId },
      select: { wordSenseId: true },
    })
  ).map((item) => item.wordSenseId)
  if (senseIds.length === 0) return false

  const masteredCount = await tx.userWord.count({
    where: { userId, status: 'mastered', wordSenseId: { in: senseIds } },
  })
  if (masteredCount < senseIds.length) return false

  const level = await tx.level.findUnique({ where: { id: levelId } })
  if (!level) return false

  const existing = await tx.userLevel.findUnique({
    where: { userId_levelId: { userId, levelId } },
  })
  if (existing?.status === 'completed') return false

  await tx.userLevel.upsert({
    where: { userId_levelId: { userId, levelId } },
    create: { userId, levelId, status: 'completed', completedAt: at },
    update: { status: 'completed', completedAt: at },
  })

  const next = await tx.level.findFirst({
    where: { unitId: level.unitId, sortOrder: { gt: level.sortOrder } },
    orderBy: { sortOrder: 'asc' },
  })
  if (next) {
    await tx.userLevel.upsert({
      where: { userId_levelId: { userId, levelId: next.id } },
      create: { userId, levelId: next.id, status: 'available' },
      update: { status: 'available' },
    })
  }
  return true
}

/**
 * 取用户当前有效阶段：必须是 unlocked 且配置了必学词的阶段。
 * 跳过 locked 阶段与没有必学词义的空壳阶段，避免补学/任务生成串到其它阶段。
 */
export async function findActiveStage(
  tx: Prisma.TransactionClient | PrismaClient,
  userId: string,
): Promise<{ stageId: string; sortOrder: number } | null> {
  const stages = await tx.userStage.findMany({
    where: { userId, status: 'unlocked' },
    include: { stage: true },
    orderBy: { stage: { sortOrder: 'asc' } },
  })
  for (const item of stages) {
    const requiredCount = await tx.stageWord.count({
      where: { stageId: item.stageId, isRequired: true },
    })
    if (requiredCount > 0) {
      return { stageId: item.stageId, sortOrder: item.stage.sortOrder }
    }
  }
  return null
}

/**
 * 检查当前阶段必学词是否全部掌握，是则自动解锁下一阶段（幂等）。
 * 已解锁/已完成的阶段不会重复处理。
 */
export async function autoUnlockStageIfReady(
  tx: TxClient,
  userId: string,
  now: Date,
): Promise<void> {
  const current = await tx.userStage.findFirst({
    where: { userId, status: 'unlocked' },
    include: { stage: true },
    orderBy: { stage: { sortOrder: 'asc' } },
  })
  if (!current) return
  if (!current) return

  const required = await tx.stageWord.findMany({
    where: { stageId: current.stageId, isRequired: true },
    select: { wordSenseId: true },
  })
  if (required.length === 0) return

  // 快速短路：已掌握总数不足必学总数时无需逐一比对
  const masteredCount = await tx.userWord.count({
    where: { userId, status: 'mastered' },
  })
  if (masteredCount < required.length) return

  const masteredIds = new Set(
    (
      await tx.userWord.findMany({
        where: { userId, status: 'mastered' },
        select: { wordSenseId: true },
      })
    ).map((item) => item.wordSenseId),
  )
  if (!required.every((item) => masteredIds.has(item.wordSenseId))) return

  const next = await tx.stage.findFirst({
    where: { sortOrder: { gt: current.stage.sortOrder } },
    orderBy: { sortOrder: 'asc' },
  })
  if (!next) return

  await tx.userStage.update({
    where: { id: current.id },
    data: { status: 'completed', completedAt: now },
  })
  await tx.userStage.upsert({
    where: { userId_stageId: { userId, stageId: next.id } },
    create: { userId, stageId: next.id, status: 'unlocked', unlockedAt: now },
    update: { status: 'unlocked', unlockedAt: now },
  })
}
