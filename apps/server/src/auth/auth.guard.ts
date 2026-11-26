import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthService } from './auth.service'
import { IS_PUBLIC_KEY } from './auth.decorators'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>
      user?: { userId: string }
    }>()
    const raw = request.headers.authorization
    const header = Array.isArray(raw) ? raw[0] : raw
    const [scheme, token] = (header ?? '').split(' ')
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('请先登录')
    }

    const userId = this.authService.verifyToken(token)
    if (!userId) throw new UnauthorizedException('登录状态已失效')
    request.user = { userId }
    return true
  }
}
