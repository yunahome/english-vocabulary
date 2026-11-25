import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 五大学习阶段（step2 初始化数据）
const stages = [
  {
    name: 'Elementary',
    code: 'ELEMENTARY',
    sortOrder: 1,
    description: 'Basic English vocabulary for elementary learners.',
  },
  {
    name: 'Junior High',
    code: 'JUNIOR_HIGH',
    sortOrder: 2,
    description: 'English vocabulary for junior high school learners.',
  },
  {
    name: 'Senior High',
    code: 'SENIOR_HIGH',
    sortOrder: 3,
    description: 'English vocabulary for senior high school learners.',
  },
  {
    name: 'CET-4',
    code: 'CET4',
    sortOrder: 4,
    description: 'College English Test Band 4 vocabulary.',
  },
  {
    name: 'IELTS',
    code: 'IELTS',
    sortOrder: 5,
    description: 'Vocabulary for IELTS preparation.',
  },
]

const words = [
  {
    word: 'vocabulary',
    phonetic: '/vəˈkæbjələri/',
    meaning: '词汇；词汇量',
    example: 'Reading helps you build vocabulary.',
  },
  {
    word: 'review',
    phonetic: '/rɪˈvjuː/',
    meaning: '复习；回顾',
    example: 'Review new words before you sleep.',
  },
  {
    word: 'familiarity',
    phonetic: '/fəˌmɪliˈærəti/',
    meaning: '熟悉度；熟悉',
    example: 'The app tracks your familiarity with each word.',
  },
]

async function main() {
  // 初始化五大阶段：upsert 保证重复执行不产生重复数据
  for (const stage of stages) {
    await prisma.stage.upsert({
      where: { code: stage.code },
      update: {
        name: stage.name,
        sortOrder: stage.sortOrder,
        description: stage.description,
        isActive: true,
      },
      create: { ...stage, isActive: true },
    })
  }
  console.log('Five learning stages initialized successfully.')

  for (const item of words) {
    await prisma.word.upsert({
      where: { word: item.word },
      update: item,
      create: item,
    })
  }
  console.log(`Seeded ${words.length} words.`)

  // 数据迁移：为旧 Word（含新 seed 的单词）回填 WordSense。
  // 旧 Word 的 meaning / example 转移到词义表，保留原字段不删以兼容现有 API。
  // 用 findFirst 判重，保证重复执行不会生成重复词义。
  const allWords = await prisma.word.findMany({ orderBy: { createdAt: 'asc' } })
  let migratedCount = 0
  for (const item of allWords) {
    const existing = await prisma.wordSense.findFirst({
      where: { wordId: item.id, definition: item.meaning },
    })
    if (existing) continue
    await prisma.wordSense.create({
      data: {
        wordId: item.id,
        partOfSpeech: 'unknown',
        definition: item.meaning,
        example: item.example,
        sortOrder: 1,
      },
    })
    migratedCount++
  }
  console.log(
    migratedCount > 0
      ? `Migrated ${migratedCount} word(s) into WordSense.`
      : 'WordSense already up to date.',
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
