import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger } from './common/logger';
import { RequestResponseInterceptor } from './common/interceptors/request-response.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { errorHandlingMiddleware } from './common/middleware/error-handling.middleware';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { validateEnvironment } from './common/env-validator';

function resolveCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN;
  if (!raw || raw.trim().length === 0) {
    return ['http://localhost:3001'];
  }

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

async function bootstrap() {
  // E5: Kiểm tra biến môi trường trước khi khởi động
  validateEnvironment();

  const app = await NestFactory.create(AppModule);
  
  // Setup validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new RequestResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // E4: Rate limiting
  app.useGlobalGuards(new RateLimitGuard());

  // Enable CORS
  app.enableCors({
    origin: resolveCorsOrigins(),
  });

  // Express-level fallback error middleware.
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(errorHandlingMiddleware);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SignalOps API')
    .setDescription('SignalOps API Gateway — Hệ thống giám sát mạng viễn thông')
    .setVersion('1.0.0')
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API key for protected ingestion endpoints',
      },
      'api-key',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-admin-api-key',
        description: 'Admin API key for managing stored api keys',
      },
      'admin-api-key',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = process.env.API_GATEWAY_PORT || 3000;
  await app.listen(port);

  Logger.info(`API Gateway đang lắng nghe tại cổng ${port}`);
}

bootstrap().catch((error) => {
  Logger.error('Không thể khởi động API Gateway', error);
  process.exit(1);
});
