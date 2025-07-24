import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QueueModule } from '@weconnect-v2/messaging';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
    QueueModule,
  ],
  controllers: [AppController, QueueController],
  providers: [AppService, QueueService],
})
export class AppModule {}
