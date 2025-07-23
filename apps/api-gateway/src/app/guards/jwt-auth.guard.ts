import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { UserServiceClient } from '../services/user-service.client';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly userServiceClient: UserServiceClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization token required');
    }

    const token = authHeader.substring(7);

    try {
      const user = await this.userServiceClient.validateToken(token);
      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }

      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
