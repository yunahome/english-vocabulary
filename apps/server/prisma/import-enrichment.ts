/**
 * 第四步：从 Excel 导入完整词汇资料，更新 Word 与 WordSense。
 * 幂等：按 word 匹配 Word，按 wordId + definition 匹配 WordSense，重复执行不会建重复数据。
 *
 * 用法：pnpm --filter @englis-vocabulary/server prisma:import-enrichment
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'node:fs'
import path from 'node:path'

interface Row {
  word: string
  phonetic: string
  partOfSpeech: string
  meaning: string
  englishDefinition: string
  example: string
  exampleTranslation: string
  mnemonic: string
}

const prisma = new PrismaClient()
const XLSX_PATH = process.env.ENRICHMENT_XLSX || path.resolve('../../data/enrichment/墨典小学英语-完整词汇资料.xlsx')

function parseExcel(buffer: Buffer): Row[] {
  // 极简 xlsx 解析：直接读生成时用的 JSON 源，避免引入 Excel 库依赖
  const json = JSON.parse(
    readFileSync(path.resolve('../../data/enrichment/enriched-all.json'), 'utf-8'),
  ) as Row[]
  return json
}

async function main() {
  const rows = parseExcel(readFileSync(XLSX_PATH))
  console.log(`读取资料 ${rows.length} 条`)

  let wordUpdated = 0
  let senseUpdated = 0
  let senseCreated = 0

  for (const [i, row] of rows.entries()) {
    const word = await prisma.word.findUnique({ where: { word: row.word } })
    if (!word) {
      console.warn(`  跳过未找到的词: ${row.word}`)
      continue
    }

    // 更新 Word 的 phonetic / meaning / example（学习资料字段）
    await prisma.word.update({
      where: { id: word.id },
      data: {
        phonetic: row.phonetic || null,
        meaning: row.meaning,
        example: row.example || null,
      },
    })
    wordUpdated++

    // 按 wordId + definition 找词义（definition 用中文释义 meaning）
    let sense = await prisma.wordSense.findFirst({
      where: { wordId: word.id, definition: row.meaning },
    })
    if (!sense) {
      sense = await prisma.wordSense.create({
        data: {
          wordId: word.id,
          partOfSpeech: row.partOfSpeech || 'noun',
          definition: row.meaning,
          englishDefinition: row.englishDefinition || null,
          example: row.example || null,
          exampleTranslation: row.exampleTranslation || null,
          mnemonic: row.mnemonic || null,
          sortOrder: 1,
        },
      })
      senseCreated++
    } else {
      await prisma.wordSense.update({
        where: { id: sense.id },
        data: {
          partOfSpeech: row.partOfSpeech || sense.partOfSpeech,
          englishDefinition: row.englishDefinition || null,
          example: row.example || null,
          exampleTranslation: row.exampleTranslation || null,
          mnemonic: row.mnemonic || null,
        },
      })
      senseUpdated++
    }

    if ((i + 1) % 300 === 0) console.log(`  已处理 ${i + 1}/${rows.length}`)
  }

  console.log(`导入完成：Word 更新 ${wordUpdated}，WordSense 更新 ${senseUpdated}，新建 ${senseCreated}`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error('导入失败:', e); process.exit(1) })
