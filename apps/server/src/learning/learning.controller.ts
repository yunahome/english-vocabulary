import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common'
import { LearningService } from './learning.service'
import { SubmitWritingDto } from './dto/submit-writing.dto'
import { CurrentUserId } from '../auth/auth.decorators'

@Controller('learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  /** 提交拼写测试结果（核心接口：判断有效掌握、7 天间隔） */
  @Post('writing')
  submitWriting(
    @CurrentUserId() userId: string,
    @Body() dto: SubmitWritingDto,
  ) {
    return this.learningService.submitWriting(userId, dto)
  }

  /** 某用户的掌握状态 */
  @Get('words')
  getUserWords(@CurrentUserId() userId: string) {
    return this.learningService.getUserWords(userId)
  }

  /** 到期复习列表 */
  @Get('due')
  getDueReviews(@CurrentUserId() userId: string) {
    return this.learningService.getDueReviews(userId)
  }

  /** 主动标记遗忘 */
  @Put('words/:wordSenseId/forgot')
  markForgotten(
    @CurrentUserId() userId: string,
    @Param('wordSenseId') wordSenseId: string,
  ) {
    return this.learningService.markForgotten(userId, wordSenseId)
  }
}
