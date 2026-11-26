/**
 * 导入墨典小学英语 PDF 词表（1532 词）到 Elementary 阶段。
 * 所有词追加到现有 Unit 1，每 100 词一个 Level（Level 2~16）。
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

  // 使用现有 Unit 1，PDF 词作为 Level 2 起追加
  const unit = await prisma.unit.findUniqueOrThrow({
    where: { stageId_sortOrder: { stageId: elementary.id, sortOrder: 1 } },
  })

  // 幂等保护：若首个待导入词已存在于 Unit 1 的 Level 2+ 中，说明导入过，直接退出
  const firstWordSense = await prisma.wordSense.findFirst({
    where: { word: { word: words[0].word } },
    select: { id: true },
  })
  if (firstWordSense) {
    const alreadyImported = await prisma.levelWord.findFirst({
      where: { wordSenseId: firstWordSense.id, level: { unitId: unit.id, sortOrder: { gte: 2 } } },
    })
    if (alreadyImported) {
      console.log('检测到 PDF 词表已导入（首词已关联到 Unit 1 的 Level 2+），跳过重复导入。')
      console.log('如需重新导入，请先删除对应的 Unit 与关卡关联。')
      return
    }
  }

  const maxLevel = await prisma.level.aggregate({
    where: { unitId: unit.id },
    _max: { sortOrder: true },
  })
  let levelOrder = (maxLevel._max.sortOrder ?? 0) + 1

  let created = 0
  let skipped = 0

  for (let offset = 0; offset < words.length; offset += WORDS_PER_LEVEL) {
    const batch = words.slice(offset, offset + WORDS_PER_LEVEL)
    const levelNo = Math.floor(offset / WORDS_PER_LEVEL) + 1

    const level = await prisma.level.upsert({
      where: { unitId_sortOrder: { unitId: unit.id, sortOrder: levelOrder } },
      create: { unitId: unit.id, name: `Level ${levelOrder}`, sortOrder: levelOrder, isActive: true },
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
    console.log(`Unit 1 / Level ${levelOrder}：${batch.length} 词（${batch[0].word} … ${batch[batch.length - 1].word}）`)
    levelOrder++
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
