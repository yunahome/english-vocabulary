import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'
import type { CreateWordInput } from '@englis-vocabulary/shared'

export class CreateWordDto implements CreateWordInput {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  word!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  meaning!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  phonetic?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  example?: string
}
