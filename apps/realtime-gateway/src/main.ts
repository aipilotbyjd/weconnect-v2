import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configure Socket.IO adapter
  app.useWebSocketAdapter(new IoAdapter(app));
  
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  
  // Enable CORS for WebSocket connections
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  });
  
  const port = process.env.REALTIME_GATEWAY_PORT || 3005;
  await app.listen(port);
  Logger.log(
    `🔄 Realtime Gateway is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(
    `🌐 WebSocket server available at: ws://localhost:${port}`
  );
  Logger.log(
    `🌍 WebRTC signaling available at: ws://localhost:${port}/webrtc`
  );
}

bootstrap().catch((error) => {
  console.error('Failed to start Realtime Gateway:', error);
  process.exit(1);
});
