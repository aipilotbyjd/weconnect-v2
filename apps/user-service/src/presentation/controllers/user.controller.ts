import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from '../../application/services/user.service';
// TODO: Fix shared library imports
interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: any;
}

interface LoginDto {
  email: string;
  password: string;
}

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern('user.register')
  async register(@Payload() createUserDto: CreateUserDto) {
    try {
      const result = await this.userService.register(createUserDto);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @MessagePattern('user.login')
  async login(@Payload() loginDto: LoginDto) {
    try {
      const result = await this.userService.login(loginDto);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @MessagePattern('user.findById')
  async findById(@Payload() { id }: { id: string }) {
    try {
      const user = await this.userService.findById(id);
      return { success: true, data: user.toSafeObject() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @MessagePattern('user.findByEmail')
  async findByEmail(@Payload() { email }: { email: string }) {
    try {
      const user = await this.userService.findByEmail(email);
      return { 
        success: true, 
        data: user ? user.toSafeObject() : null 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @MessagePattern('user.validateUser')
  async validateUser(@Payload() { email, password }: { email: string; password: string }) {
    try {
      const user = await this.userService.validateUser(email, password);
      return { 
        success: true, 
        data: user ? user.toSafeObject() : null 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @MessagePattern('user.updatePassword')
  async updatePassword(
    @Payload() { userId, currentPassword, newPassword }: { 
      userId: string; 
      currentPassword: string; 
      newPassword: string; 
    }
  ) {
    try {
      await this.userService.updatePassword(userId, currentPassword, newPassword);
      return { success: true, data: { message: 'Password updated successfully' } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @MessagePattern('user.deactivate')
  async deactivateUser(@Payload() { userId }: { userId: string }) {
    try {
      const user = await this.userService.deactivateUser(userId);
      return { success: true, data: user.toSafeObject() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @MessagePattern('user.refreshToken')
  async refreshToken(@Payload() { refreshToken }: { refreshToken: string }) {
    try {
      const result = await this.userService.refreshToken(refreshToken);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
