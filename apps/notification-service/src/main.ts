import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  
  // CORS configuration
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('WeConnect Notification Service')
    .setDescription('Multi-channel notification service for WeConnect N8N Clone')
    .setVersion('1.0')
    .addTag('notifications')
    .addTag('email')
    .addTag('sms')
    .addTag('push')
    .addTag('webhook')
    .addTag('templates')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3009;
  await app.listen(port);
  Logger.log(
    `🚀 Notification Service is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(
    `📧 Notification Swagger UI: http://localhost:${port}/docs`
  );
}

bootstrap();
