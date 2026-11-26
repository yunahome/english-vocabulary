import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { HealthModule } from './health/health.module'
import { HomeModule } from './home/home.module'
import { PrismaModule } from './prisma.module'
import { WordsModule } from './words/words.module'
import { CatalogModule } from './catalog/catalog.module'
import { LearningModule } from './learning/learning.module'
import { ProgressModule } from './progress/progress.module'
import { AuthModule } from './auth/auth.module'

/** 从当前目录逐级向上查找 .env，兼容任意启动目录（pnpm dev / node dist / tsx 直跑） */
function findEnvFiles(): string[] {
  const found: string[] = []
  const candidates = [
    resolve(__dirname, '..', '.env'),
    resolve(process.cwd(), '.env'),
  ]
  let dir = process.cwd()
  for (let i = 0; i < 5; i++) {
    candidates.push(join(dir, '.env'))
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  for (const path of candidates) {
    if (existsSync(path) && !found.includes(path)) found.push(path)
  }
  return found
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // 用绝对路径定位 .env，避免因启动目录不同而静默读不到密钥
      envFilePath: findEnvFiles(),
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    HomeModule,
    WordsModule,
    CatalogModule,
    LearningModule,
    ProgressModule,
  ],
})
export class AppModule {}
