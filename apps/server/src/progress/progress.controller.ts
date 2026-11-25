import { Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ProgressService } from './progress.service'

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('stages/init')
  initUserStages(@Query('userId') userId: string) {
    return this.progressService.initUserStages(userId)
  }

  @Get('stages')
  getUserStages(@Query('userId') userId: string) {
    return this.progressService.getUserStages(userId)
  }

  @Post('stages/:stageId/unlock-next')
  unlockNextStage(
    @Query('userId') userId: string,
    @Param('stageId') stageId: string,
  ) {
    return this.progressService.unlockNextStage(userId, stageId)
  }

  @Get('levels')
  getUserLevels(@Query('userId') userId: string) {
    return this.progressService.getUserLevels(userId)
  }

  @Post('levels/:levelId/complete')
  completeLevel(
    @Query('userId') userId: string,
    @Param('levelId') levelId: string,
  ) {
    return this.progressService.completeLevel(userId, levelId)
  }

  @Get('daily-tasks')
  getDailyTasks(
    @Query('userId') userId: string,
    @Query('date') date?: string,
  ) {
    return this.progressService.getDailyTasks(userId, date)
  }

  @Post('daily-tasks/:taskId/complete')
  completeDailyTask(
    @Query('userId') userId: string,
    @Param('taskId') taskId: string,
    @Query('date') date?: string,
  ) {
    return this.progressService.completeDailyTask(userId, taskId, date)
  }
}
