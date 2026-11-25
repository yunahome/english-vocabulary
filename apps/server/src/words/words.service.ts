import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { CreateWordDto } from './dto/create-word.dto'

@Injectable()
export class WordsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.word.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  create(dto: CreateWordDto) {
    return this.prisma.word.create({ data: dto })
  }
}
