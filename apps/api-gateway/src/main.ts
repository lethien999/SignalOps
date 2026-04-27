import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger } from './common/logger';
import { RequestResponseInterceptor } from './common/interceptors/request-response.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { errorHandlingMiddleware } from './common/middleware/error-handling.middleware';

async function bootstrap() {
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

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
  });

  // Express-level fallback error middleware.
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(errorHandlingMiddleware);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SignalOps API')
    .setDescription('SignalOps API Gateway documentation')
    .setVersion('1.0.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = process.env.API_GATEWAY_PORT || 3000;
  await app.listen(port);

  Logger.info(`API Gateway listening on port ${port}`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start API Gateway', error);
  process.exit(1);
});
