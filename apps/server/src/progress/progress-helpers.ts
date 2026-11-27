import { Prisma } from '@prisma/client'
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
