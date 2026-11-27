import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'
import { SubmitWritingDto } from './dto/submit-writing.dto'
import type { UserWordDto, WritingResultDto } from '@englis-vocabulary/shared'
import {
  MASTERY_STREAK,
  evaluateWritingAttempt,
  type MasterySnapshot,
} from './mastery-rules'
import {
  autoUnlockStageIfReady,
  completeLevelsForSense,
  incrementTodayMastered,
} from '../progress/progress-helpers'

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 提交一次拼写测试。
   *
   * 业务规则（来自 step1.md 第 7 节）：
   * - 每次测试都写入 WritingRecord，保留完整历史。
   * - 只有「独立作答 且 计划测试」才计入有效掌握次数；立即重试不计。
   * - 有效且正确 → correctStreak + 1；连续达到 3 次 → 标记 mastered。
   * - 每次正确后设置 nextReviewAt = 现在 + 7 天。
   * - 答错 → correctStreak 归零。
   * 不把规则固化在数据库里，而是由本服务根据历史记录判断。
   */
  async submitWriting(
    userId: string,
    dto: SubmitWritingDto,
  ): Promise<WritingResultDto> {
    const isIndependent = dto.isIndependent ?? true
    const attemptType = dto.attemptType ?? 'scheduled'
    const now = new Date()

    return this.prisma.$transaction(
      async (tx) => {
        const sense = await tx.wordSense.findUnique({
          where: { id: dto.wordSenseId },
          select: { id: true, word: { select: { word: true } } },
        })
        if (!sense) throw new NotFoundException('词义不存在')

        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, timezone: true },
        })
        if (!user) throw new NotFoundException('用户不存在')

        const current = await tx.userWord.findUnique({
          where: {
            userId_wordSenseId: {
              userId,
              wordSenseId: dto.wordSenseId,
            },
          },
        })
        const snapshot: MasterySnapshot | null = current
          ? {
              status: current.status as MasterySnapshot['status'],
              correctStreak: current.correctStreak,
              lastCorrectAt: current.lastCorrectAt,
              masteredAt: current.masteredAt,
              nextReviewAt: current.nextReviewAt,
            }
          : null
        const isCorrect =
          dto.inputAnswer.trim().toLowerCase() ===
          sense.word.word.trim().toLowerCase()
        const decision = evaluateWritingAttempt({
          isCorrect,
          isIndependent,
          attemptType,
          now,
          current: snapshot,
        })

        const record = await tx.writingRecord.create({
          data: {
            userId,
            wordSenseId: dto.wordSenseId,
            inputAnswer: dto.inputAnswer,
            isCorrect,
            isIndependent,
            attemptType,
            isValidMasteryAttempt: decision.isValidMasteryAttempt,
            retryOfRecordId: dto.retryOfRecordId ?? null,
            testedAt: now,
          },
        })

        const userWord = await tx.userWord.upsert({
          where: {
            userId_wordSenseId: {
              userId,
              wordSenseId: dto.wordSenseId,
            },
          },
          create: {
            userId,
            wordSenseId: dto.wordSenseId,
            status: decision.status,
            correctStreak: decision.correctStreak,
            firstLearnedAt: now,
            lastTestedAt: now,
            lastCorrectAt: decision.lastCorrectAt,
            nextReviewAt: decision.nextReviewAt,
            masteredAt: decision.masteredAt,
            forgottenAt: null,
          },
          update: {
            status: decision.status,
            correctStreak: decision.correctStreak,
            lastTestedAt: now,
            lastCorrectAt: decision.lastCorrectAt,
            nextReviewAt: decision.nextReviewAt,
            masteredAt: decision.masteredAt,
            ...(decision.clearForgotten ? { forgottenAt: null } : {}),
          },
        })

        // 首次达到掌握标准：当日掌握数 +1，并检查是否可自动解锁下一阶段
        const justMastered =
          decision.status === 'mastered' &&
          decision.isValidMasteryAttempt &&
          current?.status !== 'mastered'
        if (justMastered) {
          await incrementTodayMastered(tx, userId, now, user.timezone)
        }
        // 每次提交后检查关卡完成与阶段解锁（幂等）
        await completeLevelsForSense(tx, userId, dto.wordSenseId, now)
        await autoUnlockStageIfReady(tx, userId, now)

        return {
          recordId: record.id,
          isCorrect,
          isIndependent,
          isValidMasteryAttempt: decision.isValidMasteryAttempt,
          correctStreak: decision.correctStreak,
          status: userWord.status as WritingResultDto['status'],
          mastered: userWord.status === 'mastered',
          nextReviewAt: userWord.nextReviewAt?.toISOString() ?? null,
          reason:
            decision.status === 'mastered' && decision.isValidMasteryAttempt
              ? `连续 ${MASTERY_STREAK} 次有效正确，已掌握`
              : decision.reason,
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
  }

  /** 主动标记遗忘：掌握状态回退，但保留 WritingRecord 历史 */
  async markForgotten(userId: string, wordSenseId: string): Promise<UserWordDto> {
    const userWord = await this.prisma.userWord.findUnique({
      where: { userId_wordSenseId: { userId, wordSenseId } },
    })
    if (!userWord) throw new NotFoundException('尚未学习该词义')

    const updated = await this.prisma.userWord.update({
      where: { id: userWord.id },
      data: {
        status: 'learning',
        correctStreak: 0,
        // 与「答错」分支一致：清空上次正确时间，否则 7 天间隔检查会短路，
        // 导致标记遗忘后短期内即使答对也无法重新开始累计掌握次数。
        lastCorrectAt: null,
        masteredAt: null,
        forgottenAt: new Date(),
        nextReviewAt: new Date(),
      },
    })
    return this.toUserWordDto(updated)
  }

  /** 查询某用户的全部掌握状态 */
  async getUserWords(userId: string): Promise<UserWordDto[]> {
    const items = await this.prisma.userWord.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })
    return items.map((item) => this.toUserWordDto(item))
  }

  /** 到期需要复习的词义（nextReviewAt <= 现在，或标记遗忘的） */
  async getDueReviews(userId: string): Promise<UserWordDto[]> {
    const items = await this.prisma.userWord.findMany({
      where: {
        userId,
        status: { not: 'mastered' },
        OR: [{ nextReviewAt: { lte: new Date() } }, { forgottenAt: { not: null } }],
      },
      orderBy: { nextReviewAt: 'asc' },
    })
    return items.map((item) => this.toUserWordDto(item))
  }

  private toUserWordDto(item: {
    id: string
    userId: string
    wordSenseId: string
    status: string
    correctStreak: number
    firstLearnedAt: Date | null
    lastTestedAt: Date | null
    lastCorrectAt: Date | null
    nextReviewAt: Date | null
    masteredAt: Date | null
    forgottenAt: Date | null
  }): UserWordDto {
    return {
      id: item.id,
      userId: item.userId,
      wordSenseId: item.wordSenseId,
      status: item.status,
      correctStreak: item.correctStreak,
      firstLearnedAt: item.firstLearnedAt?.toISOString() ?? null,
      lastTestedAt: item.lastTestedAt?.toISOString() ?? null,
      lastCorrectAt: item.lastCorrectAt?.toISOString() ?? null,
      nextReviewAt: item.nextReviewAt?.toISOString() ?? null,
      masteredAt: item.masteredAt?.toISOString() ?? null,
      forgottenAt: item.forgottenAt?.toISOString() ?? null,
    }
  }
}
