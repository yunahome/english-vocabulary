import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import type {
  LevelDto,
  StageDto,
  UnitDto,
  WordSenseDto,
  WordWithSensesDto,
} from '@englis-vocabulary/shared'

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** 课程树：Stage → Unit → Level */
  async getStages(): Promise<StageDto[]> {
    const stages = await this.prisma.stage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        units: {
          orderBy: { sortOrder: 'asc' },
          include: {
            levels: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    })

    return stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      code: stage.code,
      sortOrder: stage.sortOrder,
      description: stage.description,
      isActive: stage.isActive,
      units: stage.units.map(
        (unit): UnitDto => ({
          id: unit.id,
          stageId: unit.stageId,
          name: unit.name,
          sortOrder: unit.sortOrder,
          levels: unit.levels.map(
            (level): LevelDto => ({
              id: level.id,
              unitId: level.unitId,
              name: level.name,
              sortOrder: level.sortOrder,
              isActive: level.isActive,
            }),
          ),
        }),
      ),
    }))
  }

  /** 某个关卡的词义列表（按学习顺序） */
  async getLevelWords(levelId: string): Promise<WordSenseDto[]> {
    const links = await this.prisma.levelWord.findMany({
      where: { levelId },
      orderBy: { sortOrder: 'asc' },
      include: { wordSense: true },
    })
    return links.map((link) => this.toSenseDto(link.wordSense))
  }

  /** 某个阶段的必学词义 */
  async getStageWords(stageId: string): Promise<WordSenseDto[]> {
    const links = await this.prisma.stageWord.findMany({
      where: { stageId, isRequired: true },
      orderBy: { sortOrder: 'asc' },
      include: { wordSense: true },
    })
    return links.map((link) => this.toSenseDto(link.wordSense))
  }

  /** 单词列表（带词义），供复习/查询使用 */
  async getWords(): Promise<WordWithSensesDto[]> {
    const words = await this.prisma.word.findMany({
      orderBy: { createdAt: 'desc' },
      include: { senses: { orderBy: { sortOrder: 'asc' } } },
    })
    return words.map((word) => ({
      id: word.id,
      word: word.word,
      phonetic: word.phonetic,
      senses: word.senses.map((sense) => this.toSenseDto(sense)),
    }))
  }

  private toSenseDto(sense: {
    id: string
    wordId: string
    partOfSpeech: string
    definition: string
    englishDefinition: string | null
    example: string | null
    exampleTranslation: string | null
    sortOrder: number
  }): WordSenseDto {
    return {
      id: sense.id,
      wordId: sense.wordId,
      partOfSpeech: sense.partOfSpeech,
      definition: sense.definition,
      englishDefinition: sense.englishDefinition,
      example: sense.example,
      exampleTranslation: sense.exampleTranslation,
      sortOrder: sense.sortOrder,
    }
  }
}
