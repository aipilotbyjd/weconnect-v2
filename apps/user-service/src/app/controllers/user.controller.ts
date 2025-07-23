import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from '../services/user.service';
import { User } from '../../../../../libs/domain/src/lib/user/entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { LoginDto } from '../dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Controller()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService
  ) {}

  @MessagePattern('user.register')
  async register(@Payload() registerDto: RegisterDto): Promise<{ user: User; access_token: string }> {
    const user = await this.userService.createUser(registerDto);
    
    // Generate JWT token
    const payload = { username: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    return { user, access_token };
  }

  @MessagePattern('user.login')
  async login(@Payload() loginDto: LoginDto): Promise<{ user: User; access_token: string } | null> {
    const user = await this.userService.validateUserCredentials(loginDto.email, loginDto.password);
    if (!user) {
      return null;
    }

    // Generate JWT token
    const payload = { username: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    return { user, access_token };
  }

  @MessagePattern('user.findById')
  async getUserById(@Payload() data: { id: string }): Promise<User> {
    return this.userService.getUserById(data.id);
  }

  @MessagePattern('user.findByEmail')
  async getUserByEmail(@Payload() data: { email: string }): Promise<User | null> {
    return this.userService.getUserByEmail(data.email);
  }

  @MessagePattern('user.update')
  async updateUser(@Payload() data: {
    id: string;
    updates: UpdateUserDto;
  }): Promise<User> {
    return this.userService.updateUser(data.id, data.updates);
  }

  @MessagePattern('user.delete')
  async deleteUser(@Payload() data: { id: string }): Promise<void> {
    return this.userService.deleteUser(data.id);
  }

  @MessagePattern('user.findByOrganization')
  async getUsersByOrganization(@Payload() data: { organizationId: string }): Promise<User[]> {
    return this.userService.getUsersByOrganization(data.organizationId);
  }

  @MessagePattern('user.activate')
  async activateUser(@Payload() data: { id: string }): Promise<void> {
    return this.userService.activateUser(data.id);
  }

  @MessagePattern('user.deactivate')
  async deactivateUser(@Payload() data: { id: string }): Promise<void> {
    return this.userService.deactivateUser(data.id);
  }

  @MessagePattern('user.validateToken')
  async validateToken(@Payload() data: { token: string }): Promise<User | null> {
    try {
      const payload = this.jwtService.verify(data.token);
      return this.userService.getUserById(payload.sub);
    } catch (error) {
      return null;
    }
  }

  @MessagePattern('user.refreshToken')
  async refreshToken(@Payload() data: { userId: string }): Promise<{ access_token: string }> {
    const user = await this.userService.getUserById(data.userId);
    const payload = { username: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    return { access_token };
  }
}
