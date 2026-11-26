import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'
import type { WechatLoginInput } from '@englis-vocabulary/shared'

export class WechatLoginDto implements WechatLoginInput {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  code!: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string
}
