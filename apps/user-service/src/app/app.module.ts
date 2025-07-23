import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../../../libs/src/lib/prisma/prisma.module';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { AuthService } from './services/auth.service';
import { PrismaUserRepository } from './repositories/prisma/user.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    PassportModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    AuthService,
    {
      provide: 'IUserRepository',
      useClass: PrismaUserRepository,
    },
    JwtStrategy,
    LocalStrategy,
  ],
  exports: [UserService, AuthService],
})
export class AppModule {}
