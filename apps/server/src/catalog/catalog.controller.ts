import { Controller, Get, Param } from '@nestjs/common'
import { CatalogService } from './catalog.service'

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  /** 课程树 */
  @Get('stages')
  getStages() {
    return this.catalogService.getStages()
  }

  /** 关卡词汇 */
  @Get('levels/:levelId/words')
  getLevelWords(@Param('levelId') levelId: string) {
    return this.catalogService.getLevelWords(levelId)
  }

  /** 阶段必学词汇 */
  @Get('stages/:stageId/words')
  getStageWords(@Param('stageId') stageId: string) {
    return this.catalogService.getStageWords(stageId)
  }

  /** 全部单词（带词义） */
  @Get('words')
  getWords() {
    return this.catalogService.getWords()
  }
}
