import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'
import type { SubmitWritingInput } from '@englis-vocabulary/shared'

export class SubmitWritingDto implements SubmitWritingInput {
  @IsString()
  @IsNotEmpty()
  userId!: string

  @IsString()
  @IsNotEmpty()
  wordSenseId!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  inputAnswer!: string

  @IsBoolean()
  isCorrect!: boolean

  @IsOptional()
  @IsBoolean()
  isIndependent?: boolean

  @IsOptional()
  @IsIn(['scheduled', 'immediate_retry'])
  attemptType?: 'scheduled' | 'immediate_retry'

  @IsOptional()
  @IsString()
  retryOfRecordId?: string
}
