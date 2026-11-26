/**
 * 导入墨典小学英语 PDF 词表（1532 词）到 Elementary 阶段。
 * 每 100 词一个 Unit + Level，追加在现有 Unit 1 之后（Unit 2~16）。
 * 幂等：单词/词义/关卡关联均按唯一键 upsert，可重复执行。
 *
 * 用法：pnpm --filter @englis-vocabulary/server prisma:import-pdf
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'node:fs'
import path from 'node:path'

interface PdfWord {
  no: number
  word: string
  phonetic: string
  partOfSpeech: string
  definition: string
}

const prisma = new PrismaClient()
const JSON_PATH = process.env.PDF_WORDS_JSON || path.resolve('prisma/pdf-words.json')
const WORDS_PER_LEVEL = 100

async function main() {
  const words = JSON.parse(readFileSync(JSON_PATH, 'utf-8')) as PdfWord[]
  console.log(`读取词表 ${words.length} 条：${JSON_PATH}`)

  const elementary = await prisma.stage.findUniqueOrThrow({
    where: { code: 'ELEMENTARY' },
  })

  // 幂等保护：若首个待导入词已存在于某个 Unit 的 Level 中，说明已经导入过，直接退出
  const firstWordSense = await prisma.wordSense.findFirst({
    where: { word: { word: words[0].word } },
    select: { id: true },
  })
  if (firstWordSense) {
    const alreadyImported = await prisma.levelWord.findFirst({
      where: { wordSenseId: firstWordSense.id, level: { unit: { stageId: elementary.id, sortOrder: { gt: 1 } } } },
    })
    if (alreadyImported) {
      console.log('检测到 PDF 词表已导入（首词已关联到 Unit 1 之外的关卡），跳过重复导入。')
      console.log('如需重新导入，请先删除对应的 Unit 与关卡关联。')
      return
    }
  }

  // 现有 Unit 1 已占用 sortOrder=1，从这里往后排
  const maxUnit = await prisma.unit.aggregate({
    where: { stageId: elementary.id },
    _max: { sortOrder: true },
  })
  let unitOrder = (maxUnit._max.sortOrder ?? 0) + 1

  let created = 0
  let skipped = 0

  for (let offset = 0; offset < words.length; offset += WORDS_PER_LEVEL) {
    const batch = words.slice(offset, offset + WORDS_PER_LEVEL)
    const levelNo = Math.floor(offset / WORDS_PER_LEVEL) + 1

    const unit = await prisma.unit.upsert({
      where: { stageId_sortOrder: { stageId: elementary.id, sortOrder: unitOrder } },
      create: { stageId: elementary.id, name: `Unit ${unitOrder}`, sortOrder: unitOrder },
      update: {},
    })
    const level = await prisma.level.upsert({
      where: { unitId_sortOrder: { unitId: unit.id, sortOrder: 1 } },
      create: { unitId: unit.id, name: `Level ${levelNo}`, sortOrder: 1, isActive: true },
      update: { isActive: true },
    })

    for (const [index, item] of batch.entries()) {
      const word = await prisma.word.upsert({
        where: { word: item.word },
        create: {
          word: item.word,
          lemma: item.word,
          phonetic: item.phonetic || null,
          meaning: item.definition,
          imageUrl: '📚',
        },
        update: {
          // 已存在的词（如占位词）不覆盖音标，但补上缺失的中文释义
          meaning: item.definition || undefined,
        },
      })

      // 词义按 wordId + definition 判重
      let sense = await prisma.wordSense.findFirst({
        where: { wordId: word.id, definition: item.definition },
      })
      if (!sense) {
        sense = await prisma.wordSense.create({
          data: {
            wordId: word.id,
            partOfSpeech: item.partOfSpeech || 'noun',
            definition: item.definition,
            sortOrder: 1,
          },
        })
      }

      const position = offset + index + 1
      await prisma.levelWord.upsert({
        where: { levelId_wordSenseId: { levelId: level.id, wordSenseId: sense.id } },
        create: { levelId: level.id, wordSenseId: sense.id, sortOrder: index + 1 },
        update: { sortOrder: index + 1 },
      })
      await prisma.stageWord.upsert({
        where: { stageId_wordSenseId: { stageId: elementary.id, wordSenseId: sense.id } },
        create: {
          stageId: elementary.id,
          wordSenseId: sense.id,
          isRequired: true,
          sortOrder: position,
        },
        update: { isRequired: true, sortOrder: position },
      })
      created++
      if (position % 250 === 0) console.log(`  已处理 ${position}/${words.length}`)
    }
    console.log(`Unit ${unitOrder} / Level ${levelNo}：${batch.length} 词（${batch[0].word} … ${batch[batch.length - 1].word}）`)
    unitOrder++
  }

  const totalSenses = await prisma.stageWord.count({ where: { stageId: elementary.id } })
  console.log(`导入完成：本次处理 ${created} 词，跳过 ${skipped}，Elementary 必学词义总数 ${totalSenses}`)
}

main()
  .catch((err) => {
    console.error('导入失败：', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
