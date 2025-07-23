import { Controller, Get, Put, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserServiceClient } from '../services/user-service.client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/user.decorator';
import { UpdateUserDto } from '../dto/update-user.dto';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userServiceClient: UserServiceClient) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found', schema: {
    example: {
      id: 'clxxxxxxxxxxxxxxx',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'USER',
      isActive: true,
      lastLoginAt: '2023-01-01T00:00:00.000Z'
    }
  }})
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    return this.userServiceClient.getUserById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiResponse({ status: 200, description: 'User updated', schema: {
    example: {
      id: 'clxxxxxxxxxxxxxxx',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'USER',
      isActive: true,
      lastLoginAt: '2023-01-01T00:00:00.000Z'
    }
  }})
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userServiceClient.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string) {
    return this.userServiceClient.deleteUser(id);
  }
}

