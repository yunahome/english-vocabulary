import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HealthModule } from './health/health.module'
import { PrismaModule } from './prisma.module'
import { WordsModule } from './words/words.module'
import { CatalogModule } from './catalog/catalog.module'
import { LearningModule } from './learning/learning.module'
import { ProgressModule } from './progress/progress.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    HealthModule,
    WordsModule,
    CatalogModule,
    LearningModule,
    ProgressModule,
    UsersModule,
  ],
})
export class AppModule {}
