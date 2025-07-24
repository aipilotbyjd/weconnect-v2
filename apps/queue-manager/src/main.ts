/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URLS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  
  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Queue Manager API')
    .setDescription('Advanced queue management system for WeConnect N8N Clone')
    .setVersion('2.0')
    .addTag('Queue Management')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  
  const port = process.env.PORT || 3007;
  await app.listen(port);
  
  Logger.log(`🚀 Queue Manager is running on: http://localhost:${port}/api`);
  Logger.log(`📚 API Documentation: http://localhost:${port}/docs`);
  Logger.log(`📊 Queue Health Check: http://localhost:${port}/api/queues/health`);
  Logger.log(`📈 Queue Statistics: http://localhost:${port}/api/queues/stats`);
}

bootstrap();
