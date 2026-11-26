import { Body, Controller, Get, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { Public, CurrentUserId } from './auth.decorators'
import { WechatLoginDto } from './dto/wechat-login.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('wechat/login')
  login(@Body() dto: WechatLoginDto) {
    return this.authService.login(dto)
  }

  @Get('me')
  me(@CurrentUserId() userId: string) {
    return this.authService.me(userId)
  }
}
