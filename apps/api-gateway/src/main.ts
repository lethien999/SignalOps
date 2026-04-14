import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { Logger } from './common/logger';

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

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
  });

  const port = process.env.API_GATEWAY_PORT || 3000;
  await app.listen(port);

  Logger.info(`API Gateway listening on port ${port}`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start API Gateway', error);
  process.exit(1);
});
