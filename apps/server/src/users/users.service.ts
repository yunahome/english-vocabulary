import { Injectable, ConflictException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'
import { CreateUserDto } from './dto/create-user.dto'
import type { UserDto } from '@englis-vocabulary/shared'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<UserDto> {
    // 有 openid 时按 openid 幂等；无 openid 时每次新建（开发测试用）
    if (dto.openid) {
      const existing = await this.prisma.user.findUnique({
        where: { openid: dto.openid },
      })
      if (existing) return this.toDto(existing)
    }
    const user = await this.prisma.user.create({
      data: { openid: dto.openid ?? null, nickname: dto.nickname ?? null },
    })
    return this.toDto(user)
  }

  async findAll(): Promise<UserDto[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return users.map((user) => this.toDto(user))
  }

  private toDto(user: {
    id: string
    openid: string | null
    nickname: string | null
    createdAt: Date
  }): UserDto {
    return {
      id: user.id,
      openid: user.openid,
      nickname: user.nickname,
      createdAt: user.createdAt.toISOString(),
    }
  }
}
