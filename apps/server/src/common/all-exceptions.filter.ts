import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { ApiResponse } from '@englis-vocabulary/shared'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: ApiResponse<null>) => void }
    }>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = '服务器内部错误'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const payload = exception.getResponse()
      if (typeof payload === 'string') {
        message = payload
      } else {
        const messages = (payload as { message?: string | string[] }).message
        message = Array.isArray(messages)
          ? messages.join('; ')
          : messages ?? message
      }
    } else if (
      exception instanceof Prisma.PrismaClientInitializationError ||
      exception instanceof Prisma.PrismaClientKnownRequestError
    ) {
      status = HttpStatus.SERVICE_UNAVAILABLE
      message = '数据库连接失败，请确认 PostgreSQL 已启动且 DATABASE_URL 正确'
    } else if (exception instanceof Error) {
      message = exception.message
    }

    this.logger.error(message)
    response.status(status).json({ code: status, data: null, message })
  }
}
