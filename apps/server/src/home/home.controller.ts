import { Controller, Get, Query } from '@nestjs/common'
import { HomeService } from './home.service'

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  /** 首页聚合数据：一次请求拿到所有卡片数据 */
  @Get('summary')
  getSummary(@Query('userId') userId: string) {
    return this.homeService.getSummary(userId)
  }
}
