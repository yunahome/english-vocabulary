import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ProgressService } from './progress.service'
import { CurrentUserId } from '../auth/auth.decorators'

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('stages/init')
  initUserStages(@CurrentUserId() userId: string) {
    return this.progressService.initUserStages(userId)
  }

  @Get('stages')
  getUserStages(@CurrentUserId() userId: string) {
    return this.progressService.getUserStages(userId)
  }

  @Post('stages/:stageId/unlock-next')
  unlockNextStage(
    @CurrentUserId() userId: string,
    @Param('stageId') stageId: string,
  ) {
    return this.progressService.unlockNextStage(userId, stageId)
  }

  @Get('levels')
  getUserLevels(@CurrentUserId() userId: string) {
    return this.progressService.getUserLevels(userId)
  }

  @Post('levels/:levelId/complete')
  completeLevel(
    @CurrentUserId() userId: string,
    @Param('levelId') levelId: string,
  ) {
    return this.progressService.completeLevel(userId, levelId)
  }

  @Get('daily-tasks')
  getDailyTasks(
    @CurrentUserId() userId: string,
    @Query('date') date?: string,
  ) {
    return this.progressService.getDailyTasks(userId, date)
  }

  /** PRD 7.2：保存当日学习断点（阶段/词/任务状态/10词弹窗等待态） */
  @Put('daily-tasks/session')
  saveSession(
    @CurrentUserId() userId: string,
    @Body() body: { session: string; status?: string; date?: string },
  ) {
    return this.progressService.saveSession(userId, body.session, body.status, body.date)
  }

  @Post('daily-tasks/:taskId/complete')
  completeDailyTask(
    @CurrentUserId() userId: string,
    @Param('taskId') taskId: string,
    @Query('date') date?: string,
  ) {
    return this.progressService.completeDailyTask(userId, taskId, date)
  }
}
