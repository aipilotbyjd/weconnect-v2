import { Controller, Post, Body, UseGuards, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserServiceClient } from '../services/user-service.client';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/user.decorator';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly userServiceClient: UserServiceClient) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ 
    status: 201, 
    description: 'User successfully registered',
    schema: {
      example: {
        user: {
          id: 'clxxxxxxxxxxxxxxx',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
          isActive: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        },
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.userServiceClient.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ 
    status: 200, 
    description: 'User successfully logged in',
    schema: {
      example: {
        user: {
          id: 'clxxxxxxxxxxxxxxx',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
          isActive: true,
          lastLoginAt: '2023-01-01T00:00:00.000Z'
        },
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    const result = await this.userServiceClient.login(loginDto);
    if (!result) {
      throw new Error('Invalid credentials');
    }
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ 
    status: 200, 
    description: 'Current user profile',
    schema: {
      example: {
        id: 'clxxxxxxxxxxxxxxx',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        isActive: true,
        lastLoginAt: '2023-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  async getProfile(@CurrentUser() user: any) {
    return user;
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ 
    status: 200, 
    description: 'Token refreshed successfully',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  async refreshToken(@CurrentUser() user: any) {
    return this.userServiceClient.refreshToken(user.id);
  }
}
