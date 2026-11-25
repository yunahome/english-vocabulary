import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/all-exceptions.filter'
import { TransformInterceptor } from './common/transform.interceptor'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  const prefix = config.get<string>('API_PREFIX') ?? 'api'
  const port = Number(config.get<string>('PORT') ?? 3000)

  app.setGlobalPrefix(prefix)
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN') ?? true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  app.useGlobalInterceptors(new TransformInterceptor())
  app.useGlobalFilters(new AllExceptionsFilter())

  await app.listen(port)
  console.log(`NestJS server ready: http://localhost:${port}/${prefix}`)
}

void bootstrap()
