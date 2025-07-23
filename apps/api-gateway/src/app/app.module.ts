import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { WorkflowController } from './controllers/workflow.controller';
import { UserServiceClient } from './services/user-service.client';
import { WorkflowServiceClient } from './services/workflow-service.client';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute per IP
      },
    ]),
  ],
  controllers: [
    AppController, 
    HealthController,
    AuthController,
    UserController,
    WorkflowController,
  ],
  providers: [
    AppService,
    UserServiceClient,
    WorkflowServiceClient,
    JwtAuthGuard,
  ],
})
export class AppModule {}
