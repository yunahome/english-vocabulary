import { PrismaClient } from '@prisma/client'
import { extraLessonWords } from './lesson-words-extra'

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

// 第一批正式课程词汇：Elementary → Unit 1 → Level 1
// 数据字段对应 UI 图：单词图片、音标、发音、词性、中文释义、英文释义、例句+翻译
const lessonWords = [
  {
    word: 'apple',
    phonetic: '/ˈæp.əl/',
    meaning: '苹果',
    partOfSpeech: 'noun',
    englishDefinition: 'A round fruit with red, green or yellow skin.',
    example: 'I eat an apple every day.',
    exampleTranslation: '我每天吃一个苹果。',
    emoji: '🍎',
  },
  {
    word: 'banana',
    phonetic: '/bəˈnɑː.nə/',
    meaning: '香蕉',
    partOfSpeech: 'noun',
    englishDefinition: 'A long yellow fruit with a soft sweet inside.',
    example: 'She likes bananas for breakfast.',
    exampleTranslation: '她早餐喜欢吃香蕉。',
    emoji: '🍌',
  },
  {
    word: 'cat',
    phonetic: '/kæt/',
    meaning: '猫',
    partOfSpeech: 'noun',
    englishDefinition: 'A small animal with soft fur that says meow.',
    example: 'The cat is sleeping on the sofa.',
    exampleTranslation: '猫正在沙发上睡觉。',
    emoji: '🐱',
  },
  {
    word: 'dog',
    phonetic: '/dɒɡ/',
    meaning: '狗',
    partOfSpeech: 'noun',
    englishDefinition: 'A common animal that is kept as a pet.',
    example: 'The dog runs in the park.',
    exampleTranslation: '狗在公园里跑。',
    emoji: '🐶',
  },
  {
    word: 'book',
    phonetic: '/bʊk/',
    meaning: '书',
    partOfSpeech: 'noun',
    englishDefinition: 'A set of printed pages that you read.',
    example: 'I read a book before bed.',
    exampleTranslation: '我睡前读一本书。',
    emoji: '📖',
  },
  // 以下为基础占位词：让 Level 1 达到 12 词，便于验证「每 10 词弹窗」流程。
  // 后续接入正式课程数据时可替换为完整词表（seed 逻辑幂等，不会生成重复词义）。
  {
    word: 'egg',
    phonetic: '/eɡ/',
    meaning: '鸡蛋',
    partOfSpeech: 'noun',
    englishDefinition: 'An oval food laid by a hen.',
    example: 'I have an egg for breakfast.',
    exampleTranslation: '我早餐吃一个鸡蛋。',
    emoji: '🥚',
  },
  {
    word: 'fish',
    phonetic: '/fɪʃ/',
    meaning: '鱼',
    partOfSpeech: 'noun',
    englishDefinition: 'An animal that lives in water and has fins.',
    example: 'The fish swims in the river.',
    exampleTranslation: '鱼在河里游。',
    emoji: '🐟',
  },
  {
    word: 'bird',
    phonetic: '/bɜːd/',
    meaning: '鸟',
    partOfSpeech: 'noun',
    englishDefinition: 'An animal with wings that can usually fly.',
    example: 'A bird is singing in the tree.',
    exampleTranslation: '一只鸟在树上唱歌。',
    emoji: '🐦',
  },
  {
    word: 'milk',
    phonetic: '/mɪlk/',
    meaning: '牛奶',
    partOfSpeech: 'noun',
    englishDefinition: 'A white drink that comes from cows.',
    example: 'She drinks a glass of milk every morning.',
    exampleTranslation: '她每天早上喝一杯牛奶。',
    emoji: '🥛',
  },
  {
    word: 'water',
    phonetic: '/ˈwɔː.tə/',
    meaning: '水',
    partOfSpeech: 'noun',
    englishDefinition: 'A clear liquid that people drink.',
    example: 'Please give me a cup of water.',
    exampleTranslation: '请给我一杯水。',
    emoji: '💧',
  },
  {
    word: 'sun',
    phonetic: '/sʌn/',
    meaning: '太阳',
    partOfSpeech: 'noun',
    englishDefinition: 'The bright star that gives us light and heat.',
    example: 'The sun is shining today.',
    exampleTranslation: '今天阳光明媚。',
    emoji: '☀️',
  },
  {
    word: 'moon',
    phonetic: '/muːn/',
    meaning: '月亮',
    partOfSpeech: 'noun',
    englishDefinition: 'The round object that shines in the night sky.',
    example: 'The moon looks bright tonight.',
    exampleTranslation: '今晚月亮看起来很亮。',
    emoji: '🌙',
  },
  // 第二批占位词：补足到 20 个，让「每 10 词弹窗 → Continue Learning」有后续词可学
  {
    word: 'tree',
    phonetic: '/triː/',
    meaning: '树',
    partOfSpeech: 'noun',
    englishDefinition: 'A tall plant with a trunk and leaves.',
    example: 'There is a big tree in the garden.',
    exampleTranslation: '花园里有一棵大树。',
    emoji: '🌳',
  },
  {
    word: 'flower',
    phonetic: '/ˈflaʊ.ə/',
    meaning: '花',
    partOfSpeech: 'noun',
    englishDefinition: 'A colourful plant that grows in gardens.',
    example: 'She picks a flower for her mother.',
    exampleTranslation: '她摘了一朵花给妈妈。',
    emoji: '🌸',
  },
  {
    word: 'house',
    phonetic: '/haʊs/',
    meaning: '房子',
    partOfSpeech: 'noun',
    englishDefinition: 'A building where people live.',
    example: 'Their house is near the school.',
    exampleTranslation: '他们的房子在学校附近。',
    emoji: '🏠',
  },
  {
    word: 'car',
    phonetic: '/kɑː/',
    meaning: '汽车',
    partOfSpeech: 'noun',
    englishDefinition: 'A road vehicle with four wheels.',
    example: 'My father drives a blue car.',
    exampleTranslation: '我爸爸开一辆蓝色的车。',
    emoji: '🚗',
  },
  {
    word: 'pen',
    phonetic: '/pen/',
    meaning: '钢笔',
    partOfSpeech: 'noun',
    englishDefinition: 'A tool used for writing with ink.',
    example: 'I write my name with a pen.',
    exampleTranslation: '我用钢笔写名字。',
    emoji: '🖊️',
  },
  {
    word: 'chair',
    phonetic: '/tʃeə/',
    meaning: '椅子',
    partOfSpeech: 'noun',
    englishDefinition: 'A seat with a back and four legs.',
    example: 'Please sit on the chair.',
    exampleTranslation: '请坐在椅子上。',
    emoji: '🪑',
  },
  {
    word: 'bread',
    phonetic: '/bred/',
    meaning: '面包',
    partOfSpeech: 'noun',
    englishDefinition: 'A common food made from flour.',
    example: 'We have bread for breakfast.',
    exampleTranslation: '我们早餐吃面包。',
    emoji: '🍞',
  },
  {
    word: 'bag',
    phonetic: '/bæɡ/',
    meaning: '书包',
    partOfSpeech: 'noun',
    englishDefinition: 'A container used to carry things.',
    example: 'My books are in the bag.',
    exampleTranslation: '我的书在书包里。',
    emoji: '🎒',
  },
  ...extraLessonWords,
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

  // 第一批课程：Elementary → Unit 1 → Level 1
  const elementary = await prisma.stage.findUniqueOrThrow({
    where: { code: 'ELEMENTARY' },
  })

  const unit = await prisma.unit.upsert({
    where: { stageId_sortOrder: { stageId: elementary.id, sortOrder: 1 } },
    create: { stageId: elementary.id, name: 'Unit 1', sortOrder: 1 },
    update: { name: 'Unit 1' },
  })
  const level = await prisma.level.upsert({
    where: { unitId_sortOrder: { unitId: unit.id, sortOrder: 1 } },
    create: { unitId: unit.id, name: 'Level 1', sortOrder: 1, isActive: true },
    update: { isActive: true },
  })
  console.log('Course structure ready: Elementary / Unit 1 / Level 1.')

  // 录入正式课程词汇，并创建完整 WordSense（含词性、英文释义、例句翻译）
  const lessonSenseIds: string[] = []
  for (const [index, item] of lessonWords.entries()) {
    const word = await prisma.word.upsert({
      where: { word: item.word },
      create: {
        word: item.word,
        lemma: item.word,
        phonetic: item.phonetic,
        meaning: item.meaning,
        example: item.example,
        imageUrl: item.emoji,
      },
      update: {
        lemma: item.word,
        phonetic: item.phonetic,
        meaning: item.meaning,
        example: item.example,
        imageUrl: item.emoji,
      },
    })

    // 用 wordId + definition 判重，保证幂等
    let sense = await prisma.wordSense.findFirst({
      where: { wordId: word.id, definition: item.meaning },
    })
    if (!sense) {
      sense = await prisma.wordSense.create({
        data: {
          wordId: word.id,
          partOfSpeech: item.partOfSpeech,
          definition: item.meaning,
          englishDefinition: item.englishDefinition,
          example: item.example,
          exampleTranslation: item.exampleTranslation,
          sortOrder: 1,
        },
      })
    }
    lessonSenseIds.push(sense.id)

    // 关联到关卡（学习顺序即录入顺序）
    await prisma.levelWord.upsert({
      where: {
        levelId_wordSenseId: { levelId: level.id, wordSenseId: sense.id },
      },
      create: { levelId: level.id, wordSenseId: sense.id, sortOrder: index + 1 },
      update: { sortOrder: index + 1 },
    })

    // 标记为 Elementary 阶段必学
    await prisma.stageWord.upsert({
      where: {
        stageId_wordSenseId: { stageId: elementary.id, wordSenseId: sense.id },
      },
      create: {
        stageId: elementary.id,
        wordSenseId: sense.id,
        isRequired: true,
        sortOrder: index + 1,
      },
      update: { isRequired: true },
    })
  }
  console.log(`Seeded ${lessonWords.length} lesson words into Level 1 and StageWord.`)

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
