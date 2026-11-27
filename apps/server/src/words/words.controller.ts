import { Controller, Get } from '@nestjs/common'
import { WordsService } from './words.service'

/**
 * 词库只读接口。
 * 写入课程词统一走 prisma/seed.ts 与 prisma/import-pdf-words.ts，
 * 不开放运行时写接口，避免任意用户污染课程数据。
 */
@Controller('words')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Get()
  findAll() {
    return this.wordsService.findAll()
  }
}
