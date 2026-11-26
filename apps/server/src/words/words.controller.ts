import { Body, Controller, Get, Post } from '@nestjs/common'
import { CreateWordDto } from './dto/create-word.dto'
import { WordsService } from './words.service'
import { Public } from '../auth/auth.decorators'

@Controller('words')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Public()
  @Get()
  findAll() {
    return this.wordsService.findAll()
  }

  @Post()
  create(@Body() dto: CreateWordDto) {
    return this.wordsService.create(dto)
  }
}
