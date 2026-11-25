import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'
import { SubmitWritingDto } from './dto/submit-writing.dto'
import type { UserWordDto, WritingResultDto } from '@englis-vocabulary/shared'

/** 掌握所需的有效正确次数 */
const MASTERY_STREAK = 3
/** 复习间隔（天） */
const REVIEW_INTERVAL_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

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
  async submitWriting(dto: SubmitWritingDto): Promise<WritingResultDto> {
    const isIndependent = dto.isIndependent ?? true
    const attemptType = dto.attemptType ?? 'scheduled'
    const isValidMasteryAttempt = isIndependent && attemptType === 'scheduled'

    // 确认词义存在
    const sense = await this.prisma.wordSense.findUnique({
      where: { id: dto.wordSenseId },
      select: { id: true },
    })
    if (!sense) throw new NotFoundException('词义不存在')

    // 确认用户存在
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    })
    if (!user) throw new NotFoundException('用户不存在')

    // 读取当前掌握状态（不存在则视为全新）
    const current = await this.prisma.userWord.findUnique({
      where: {
        userId_wordSenseId: {
          userId: dto.userId,
          wordSenseId: dto.wordSenseId,
        },
      },
    })

    const now = new Date()
    let correctStreak = current?.correctStreak ?? 0
    let status: 'not_started' | 'learning' | 'mastered' =
      (current?.status as 'not_started' | 'learning' | 'mastered') ?? 'not_started'
    let masteredAt: Date | null = current?.masteredAt ?? null
    let nextReviewAt: Date | null = current?.nextReviewAt ?? null

    if (dto.isCorrect) {
      correctStreak = isValidMasteryAttempt ? correctStreak + 1 : correctStreak
      nextReviewAt = new Date(now.getTime() + REVIEW_INTERVAL_DAYS * DAY_MS)
      if (correctStreak >= MASTERY_STREAK && isValidMasteryAttempt) {
        status = 'mastered'
        masteredAt = current?.masteredAt ?? now
      } else if (status === 'not_started') {
        status = 'learning'
      }
    } else {
      // 答错：连续正确次数清零，已掌握的词退回学习中
      correctStreak = 0
      if (status === 'mastered') {
        status = 'learning'
      }
    }

    // 每一次测试都落库，保留完整历史
    const record = await this.prisma.writingRecord.create({
      data: {
        userId: dto.userId,
        wordSenseId: dto.wordSenseId,
        inputAnswer: dto.inputAnswer,
        isCorrect: dto.isCorrect,
        isIndependent,
        attemptType,
        isValidMasteryAttempt,
        retryOfRecordId: dto.retryOfRecordId ?? null,
        testedAt: now,
      },
    })

    // upsert 掌握状态
    const userWord = await this.prisma.userWord.upsert({
      where: {
        userId_wordSenseId: {
          userId: dto.userId,
          wordSenseId: dto.wordSenseId,
        },
      },
      create: {
        userId: dto.userId,
        wordSenseId: dto.wordSenseId,
        status,
        correctStreak,
        firstLearnedAt: now,
        lastTestedAt: now,
        lastCorrectAt: dto.isCorrect ? now : null,
        nextReviewAt,
        masteredAt,
      },
      update: {
        status,
        correctStreak,
        lastTestedAt: now,
        ...(dto.isCorrect ? { lastCorrectAt: now } : {}),
        nextReviewAt,
        ...(masteredAt ? { masteredAt } : {}),
      },
    })

    return {
      recordId: record.id,
      isCorrect: dto.isCorrect,
      isIndependent,
      isValidMasteryAttempt,
      correctStreak,
      status: userWord.status as WritingResultDto['status'],
      mastered: userWord.status === 'mastered',
      nextReviewAt: userWord.nextReviewAt?.toISOString() ?? null,
      reason: !isValidMasteryAttempt
        ? '立即重试或非独立作答，不计入有效掌握次数'
        : dto.isCorrect
          ? correctStreak >= MASTERY_STREAK
            ? `连续 ${correctStreak} 次有效正确，已掌握`
            : `有效正确，连续 ${correctStreak}/${MASTERY_STREAK} 次`
          : '回答错误，连续正确次数已清零',
    }
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
