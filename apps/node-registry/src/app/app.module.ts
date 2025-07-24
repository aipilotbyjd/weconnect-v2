import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NodeRegistryModule } from './node-registry/node-registry.module';
import { DatabaseModule } from '@weconnect-v2/database';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    NodeRegistryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
