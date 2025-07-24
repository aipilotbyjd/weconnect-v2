import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  
  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Node Registry API')
    .setDescription('API for managing workflow nodes')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  
  const port = process.env.NODE_REGISTRY_PORT || 3004;
  await app.listen(port);
  Logger.log(
    `🔧 Node Registry is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(
    `📚 Swagger docs available at: http://localhost:${port}/docs`
  );
}

bootstrap().catch((error) => {
  console.error('Failed to start Node Registry:', error);
  process.exit(1);
});
