import { Controller, Get } from '@nestjs/common'
import type { HealthDto } from '@englis-vocabulary/shared'

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }
}
