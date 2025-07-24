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
    .setTitle('WeConnect Analytics Service')
    .setDescription('Analytics and metrics tracking service for WeConnect N8N Clone')
    .setVersion('1.0')
    .addTag('analytics')
    .addTag('metrics')
    .addTag('reports')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3008;
  await app.listen(port);
  Logger.log(
    `🚀 Analytics Service is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(
    `📊 Analytics Swagger UI: http://localhost:${port}/docs`
  );
}

bootstrap();
