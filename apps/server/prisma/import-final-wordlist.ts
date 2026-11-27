/**
 * 全量导入最终词表（1079 词），按 Excel 行顺序写入 sortOrder。
 *
 * 策略：
 * 1. 解析 data/integration/final-wordlist.json（由最终 Excel 导出）
 * 2. 按 word 建/更新 Word，按 wordId + definition 建/更新 WordSense，sortOrder = 行号
 * 3. 清空旧 LevelWord / StageWord，按行顺序重建（每 100 词一个 Level，追加到 Unit 1）
 * 4. 迁移用户学习记录：按 old 词义的 word+definition 找到 new 词义 ID，重定向引用
 * 5. 无法映射的旧词义记录归档统计后删除（随 WordSense 级联）
 *
 * 前置：已在 data/integration/backups/ 备份全库。
 * 用法：pnpm --filter @englis-vocabulary/server prisma:import-final
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
  pronunciationUrl: string
  imageUrl: string
  usageNotes: string
  sourceText: string
}

const prisma = new PrismaClient()
const LIST_PATH = path.resolve('../../data/integration/final-wordlist.json')
const WORDS_PER_LEVEL = 100

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

async function main() {
  const rows = JSON.parse(readFileSync(LIST_PATH, 'utf-8')) as Row[]
  console.log(`读取最终词表 ${rows.length} 条`)

  // ---- 1. 记录旧词义的 word+definition → id 映射，用于迁移 ----
  const oldSenses = await prisma.wordSense.findMany({ include: { word: true } })
  const oldKeyToId = new Map<string, string>()
  for (const s of oldSenses) {
    oldKeyToId.set(`${s.word.word.toLowerCase()}|${s.definition}`, s.id)
  }
  console.log(`旧词义 ${oldSenses.length} 条`)

  // ---- 2. 建/更新 Word 与 WordSense ----
  let wordCreated = 0
  let senseCreated = 0
  const newSenseIds: string[] = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const sortOrder = i + 1
    const wordName = str(r.word).trim()
    if (!wordName) continue

    const word = await prisma.word.upsert({
      where: { word: wordName },
      create: {
        word: wordName,
        phonetic: str(r.phonetic) || null,
        meaning: str(r.meaning) || '',
        pronunciationUrl: str(r.pronunciationUrl) || null,
        imageUrl: str(r.imageUrl) || null,
        example: str(r.example) || null,
      },
      update: {
        phonetic: str(r.phonetic) || null,
        meaning: str(r.meaning) || '',
        pronunciationUrl: str(r.pronunciationUrl) || null,
        imageUrl: str(r.imageUrl) || null,
        example: str(r.example) || null,
      },
    })

    const definition = str(r.meaning) || ''
    // 处理历史重复词义（如同名词义因资料补充产生两条）：保留有关卡/用户数据的一条，其余删除
    const allSame = await prisma.wordSense.findMany({ where: { wordId: word.id, definition } })
    if (allSame.length > 1) {
      const keeper = allSame.find((s) => s.usageNotes) ?? allSame[0]
      for (const s of allSame) {
        if (s.id === keeper.id) continue
        const refs = await Promise.all([
          prisma.userWord.count({ where: { wordSenseId: s.id } }),
          prisma.writingRecord.count({ where: { wordSenseId: s.id } }),
          prisma.dailyTask.count({ where: { wordSenseId: s.id } }),
          prisma.levelWord.count({ where: { wordSenseId: s.id } }),
        ])
        if (refs.every((n) => n === 0)) await prisma.wordSense.delete({ where: { id: s.id } })
      }
    }
    const existing = allSame.find((s) => s.usageNotes) ?? allSame[0]
    const senseData = {
      partOfSpeech: str(r.partOfSpeech) || 'noun',
      englishDefinition: str(r.englishDefinition) || null,
      example: str(r.example) || null,
      exampleTranslation: str(r.exampleTranslation) || null,
      mnemonic: str(r.mnemonic) || null,
      usageNotes: str(r.usageNotes) || null,
      sourceText: str(r.sourceText) || null,
      sortOrder,
    }
    let sense
    if (existing) {
      sense = await prisma.wordSense.update({ where: { id: existing.id }, data: senseData })
    } else {
      sense = await prisma.wordSense.create({
        data: { wordId: word.id, definition, ...senseData },
      })
      senseCreated++
    }
    newSenseIds.push(sense.id)
  }
  console.log(`WordSense 新建 ${senseCreated}，最终 ${newSenseIds.length}`)

  // ---- 3. 重建课程关联（LevelWord / StageWord）----
  const elementary = await prisma.stage.findUniqueOrThrow({ where: { code: 'ELEMENTARY' } })
  const unit = await prisma.unit.findUniqueOrThrow({
    where: { stageId_sortOrder: { stageId: elementary.id, sortOrder: 1 } },
  })

  await prisma.levelWord.deleteMany({ where: { level: { unitId: unit.id } } })
  await prisma.stageWord.deleteMany({ where: { stageId: elementary.id } })
  console.log('已清空旧 LevelWord / StageWord')

  const levelCount = Math.ceil(newSenseIds.length / WORDS_PER_LEVEL)
  for (let i = 0; i < levelCount; i++) {
    const level = await prisma.level.upsert({
      where: { unitId_sortOrder: { unitId: unit.id, sortOrder: i + 1 } },
      create: { unitId: unit.id, name: `Level ${i + 1}`, sortOrder: i + 1, isActive: true },
      update: { isActive: true },
    })
    const batch = newSenseIds.slice(i * WORDS_PER_LEVEL, (i + 1) * WORDS_PER_LEVEL)
    let seq = 0
    for (const senseId of batch) {
      await prisma.levelWord.create({ data: { levelId: level.id, wordSenseId: senseId, sortOrder: seq++ } })
      await prisma.stageWord.create({
        data: { stageId: elementary.id, wordSenseId: senseId, isRequired: true, sortOrder: i * WORDS_PER_LEVEL + seq },
      })
    }
    console.log(`Level ${i + 1}: ${batch.length} 词`)
  }
  // 删除多余 Level
  const extra = await prisma.level.findMany({ where: { unitId: unit.id, sortOrder: { gt: levelCount } } })
  for (const l of extra) await prisma.level.delete({ where: { id: l.id } })
  console.log(`最终 ${levelCount} 个 Level`)

  // ---- 4. 迁移用户学习记录 ----
  const newSenses = await prisma.wordSense.findMany({
    where: { id: { in: newSenseIds } },
    include: { word: true },
  })
  const newKeyToId = new Map<string, string>()
  for (const s of newSenses) {
    newKeyToId.set(`${s.word.word.toLowerCase()}|${s.definition}`, s.id)
  }
  // 新词义 id 集合，用于直接保留（若旧 id 恰好相同）
  const newIdSet = new Set(newSenses.map((s) => s.id))

  let migrated = 0
  let dropped = 0
  for (const old of oldSenses) {
    const key = `${old.word.word.toLowerCase()}|${old.definition}`
    const targetId = newKeyToId.get(key)
    if (!targetId || targetId === old.id) continue
    // UserWord
    const uw = await prisma.userWord.findMany({ where: { wordSenseId: old.id } })
    for (const rec of uw) {
      const dup = await prisma.userWord.findUnique({
        where: { userId_wordSenseId: { userId: rec.userId, wordSenseId: targetId } },
      })
      if (dup) {
        await prisma.userWord.delete({ where: { id: rec.id } })
      } else {
        await prisma.userWord.update({ where: { id: rec.id }, data: { wordSenseId: targetId } })
      }
      migrated++
    }
    // WritingRecord
    const wr = await prisma.writingRecord.findMany({ where: { wordSenseId: old.id } })
    for (const rec of wr) {
      await prisma.writingRecord.update({ where: { id: rec.id }, data: { wordSenseId: targetId } })
      migrated++
    }
    // DailyTask：已完成的迁移，未完成的直接删（重新生成）
    const dt = await prisma.dailyTask.findMany({ where: { wordSenseId: old.id } })
    for (const rec of dt) {
      if (rec.taskStatus === 'completed') {
        await prisma.dailyTask.update({ where: { id: rec.id }, data: { wordSenseId: targetId } })
        migrated++
      } else {
        await prisma.dailyTask.delete({ where: { id: rec.id } })
        dropped++
      }
    }
  }
  console.log(`用户记录迁移 ${migrated} 条，删除未完成旧任务 ${dropped} 条`)

  // ---- 5. 删除不在新词表中的旧 Word / WordSense ----
  const toDelete = oldSenses.filter((s) => !newIdSet.has(s.id) && !newKeyToId.has(`${s.word.word.toLowerCase()}|${s.definition}`))
  for (const s of toDelete) {
    // 级联会清掉残留关联
    try { await prisma.wordSense.delete({ where: { id: s.id } }) } catch { /* 已级联删除 */ }
  }
  console.log(`清理旧词义 ${toDelete.length} 条`)

  // 清理没有词义的空 Word（如 e2etest 残留）
  const emptyWords = await prisma.word.findMany({ where: { senses: { none: {} } } })
  for (const w of emptyWords) {
    try { await prisma.word.delete({ where: { id: w.id } }) } catch { /* 忽略 */ }
  }
  console.log(`清理空 Word ${emptyWords.length} 条`)

  // ---- 6. 统计 ----
  const stats = {
    word: await prisma.word.count(),
    wordSense: await prisma.wordSense.count(),
    levelWord: await prisma.levelWord.count(),
    stageWord: await prisma.stageWord.count(),
    userWord: await prisma.userWord.count(),
    writingRecord: await prisma.writingRecord.count(),
  }
  console.log('最终统计:', JSON.stringify(stats))
  if (stats.wordSense !== rows.length || stats.levelWord !== rows.length) {
    throw new Error('导入数量不符，请检查')
  }
  console.log('导入完成')
}

main()
  .catch((e) => {
    console.error('导入失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
