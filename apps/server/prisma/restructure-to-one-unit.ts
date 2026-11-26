/**
 * 课程结构迁移：17 个 Unit（每 Unit 1 关）→ 1 个 Unit + 16 个 Level。
 * 按 StageWord.sortOrder 的顺序把所有必学词义重新分配到 16 个关卡。
 * 幂等：若已是 1 个 Unit 且 16 个 Level 则跳过。
 *
 * 用法：pnpm --filter @englis-vocabulary/server prisma:restructure
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TARGET_LEVELS = 16

async function main() {
  const elementary = await prisma.stage.findUniqueOrThrow({
    where: { code: 'ELEMENTARY' },
  })

  const units = await prisma.unit.findMany({
    where: { stageId: elementary.id },
    orderBy: { sortOrder: 'asc' },
    include: { levels: true },
  })

  if (units.length === 1 && units[0].levels.length === TARGET_LEVELS) {
    console.log('课程结构已是 1 个 Unit + 16 个 Level，跳过迁移。')
    return
  }
  console.log(`迁移前：${units.length} 个 Unit`)

  // 收集所有关卡词，按 StageWord.sortOrder 排序（保持学习顺序）
  const stageWords = await prisma.stageWord.findMany({
    where: { stageId: elementary.id },
    orderBy: { sortOrder: 'asc' },
    select: { wordSenseId: true },
  })
  console.log(`必学词义总数：${stageWords.length}`)

  // 1) 删除全部旧 Unit（级联删除 Level 与 LevelWord）
  for (const unit of units) {
    await prisma.level.deleteMany({ where: { unitId: unit.id } })
    await prisma.unit.delete({ where: { id: unit.id } })
  }

  // 2) 新建唯一的 Unit 1
  const unit = await prisma.unit.create({
    data: { stageId: elementary.id, name: 'Unit 1', sortOrder: 1 },
  })

  // 3) 按每关约 96 词切分为 16 个 Level
  const perLevel = Math.ceil(stageWords.length / TARGET_LEVELS)
  for (let i = 0; i < TARGET_LEVELS; i++) {
    const batch = stageWords.slice(i * perLevel, (i + 1) * perLevel)
    const level = await prisma.level.create({
      data: {
        unitId: unit.id,
        name: `Level ${i + 1}`,
        sortOrder: i + 1,
        isActive: true,
      },
    })
    for (const [index, item] of batch.entries()) {
      await prisma.levelWord.create({
        data: {
          levelId: level.id,
          wordSenseId: item.wordSenseId,
          sortOrder: index + 1,
        },
      })
    }
    console.log(`  Level ${i + 1}：${batch.length} 词`)
  }

  console.log('迁移完成：1 个 Unit + 16 个 Level')
}

main()
  .catch((err) => {
    console.error('迁移失败：', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
