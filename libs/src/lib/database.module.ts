import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule, PrismaService } from './prisma';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from './redis';

@Global()
@Module({
  imports: [
    // PostgreSQL with Prisma
    PrismaModule,
    
    // MongoDB with Mongoose
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URL'),
        dbName: 'weconnect_v2',
      }),
      inject: [ConfigService],
    }),
    
    // Redis
    RedisModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService, MongooseModule, RedisModule],
})
export class DatabaseModule {}
