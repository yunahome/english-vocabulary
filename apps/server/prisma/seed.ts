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
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
