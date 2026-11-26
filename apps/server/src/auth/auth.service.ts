import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma.service'
import { ProgressService } from '../progress/progress.service'
import { resolveTimeZone } from '../common/date-time'
import type { AuthSessionDto, UserDto } from '@englis-vocabulary/shared'
import { WechatLoginDto } from './dto/wechat-login.dto'
import { signSessionToken, verifySessionToken } from './token'

interface Code2SessionResponse {
  openid?: string
  session_key?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly progress: ProgressService,
  ) {}

  async login(dto: WechatLoginDto): Promise<AuthSessionDto> {
    const session = await this.exchangeWechatCode(dto.code)
    if (!session.openid) {
      throw new UnauthorizedException('微信登录未返回 openid')
    }

    const timezone = resolveTimeZone(dto.timezone)
    const user = await this.prisma.user.upsert({
      where: { openid: session.openid },
      create: {
        openid: session.openid,
        nickname: '学习者',
        timezone,
      },
      update: { timezone },
    })
    await this.progress.initUserStages(user.id)

    return {
      token: this.issueToken(user.id),
      user: this.toPublicUser(user),
    }
  }

  async me(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new UnauthorizedException('登录状态已失效')
    return this.toPublicUser(user)
  }

  verifyToken(token: string): string | null {
    const payload = verifySessionToken(token, this.tokenSecret())
    return payload?.sub ?? null
  }

  private issueToken(userId: string): string {
    const configuredTtl = Number(this.config.get<string>('AUTH_TOKEN_TTL_SECONDS') ?? 2592000)
    const ttl = Number.isFinite(configuredTtl) && configuredTtl > 0 ? configuredTtl : 2592000
    return signSessionToken(userId, this.tokenSecret(), ttl)
  }

  private tokenSecret(): string {
    const secret = this.config.get<string>('AUTH_TOKEN_SECRET')
    if (secret && !secret.startsWith('replace-with-')) return secret
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new ServiceUnavailableException('AUTH_TOKEN_SECRET 未配置')
    }
    return 'development-only-auth-secret-change-before-release'
  }

  private async exchangeWechatCode(code: string): Promise<Code2SessionResponse> {
    const appId =
      this.config.get<string>('WECHAT_APP_ID') ?? 'wx9ed13f9f8cbcf771'
    const appSecret = this.config.get<string>('WECHAT_APP_SECRET')
    if (!appSecret) {
      throw new ServiceUnavailableException('WECHAT_APP_SECRET 未配置')
    }

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
    url.searchParams.set('appid', appId)
    url.searchParams.set('secret', appSecret)
    url.searchParams.set('js_code', code)
    url.searchParams.set('grant_type', 'authorization_code')

    let response: Response
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(8000) })
    } catch {
      throw new BadGatewayException('连接微信登录服务失败')
    }
    if (!response.ok) throw new BadGatewayException('微信登录服务暂时不可用')

    const data = (await response.json()) as Code2SessionResponse
    if (data.errcode) {
      throw new UnauthorizedException(data.errmsg || '微信登录凭证无效')
    }
    return data
  }

  private toPublicUser(user: {
    id: string
    nickname: string | null
    timezone: string
    createdAt: Date
  }): UserDto {
    return {
      id: user.id,
      // openid 只在服务端使用，不返回给小程序。
      openid: null,
      nickname: user.nickname,
      timezone: user.timezone,
      createdAt: user.createdAt.toISOString(),
    }
  }
}
