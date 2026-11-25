import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
