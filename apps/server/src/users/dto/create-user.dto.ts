import { IsOptional, IsString, MaxLength } from 'class-validator'
import type { CreateUserInput } from '@englis-vocabulary/shared'

export class CreateUserDto implements CreateUserInput {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  openid?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string
}
