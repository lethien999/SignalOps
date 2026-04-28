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
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
  });

  // Express-level fallback error middleware.
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(errorHandlingMiddleware);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SignalOps API')
    .setDescription('SignalOps API Gateway — Hệ thống giám sát mạng viễn thông')
    .setVersion('1.0.0')
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
