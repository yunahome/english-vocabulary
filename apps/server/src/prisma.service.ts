import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

/**
 * Prisma 客户端封装。
 * 不在 onModuleInit 时强制连接，这样即使数据库暂时不可用，
 * 健康检查接口仍然可以访问；真正查询时 Prisma 会按需连接。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
