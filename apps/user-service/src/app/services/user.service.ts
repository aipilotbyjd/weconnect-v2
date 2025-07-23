import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { IUserRepository } from '../../../../../libs/domain/src/lib/user/repositories/user.repository.interface';
import { User } from '../../../../../libs/domain/src/lib/user/entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository
  ) {}

  async createUser(registerDto: RegisterDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.userRepository.create({
      id: uuidv4(),
      email: registerDto.email,
      password: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      organizationId: registerDto.organizationId || null,
      role: registerDto.role || 'USER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    });

    // Remove password from response
    const { password, ...result } = user;
    return result as User;
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Remove password from response
    const { password, ...result } = user;
    return result as User;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return null;
    }

    // Remove password from response
    const { password, ...result } = user;
    return result as User;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const existingUser = await this.getUserById(id);

    const updatedUser = await this.userRepository.update(id, {
      ...updateUserDto,
      updatedAt: new Date(),
    });

    // Remove password from response
    const { password, ...result } = updatedUser;
    return result as User;
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.getUserById(id);
    await this.userRepository.delete(id);
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    const users = await this.userRepository.findByOrganizationId(organizationId);
    
    // Remove passwords from response
    return users.map(user => {
      const { password, ...result } = user;
      return result as User;
    });
  }

  async deactivateUser(id: string): Promise<void> {
    const user = await this.getUserById(id);
    await this.userRepository.deactivate(id);
  }

  async activateUser(id: string): Promise<void> {
    const user = await this.getUserById(id);
    await this.userRepository.activate(id);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.updateLastLogin(id);
  }

  async validateUserCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // Update last login
    await this.updateLastLogin(user.id);

    // Remove password from response
    const { password: _, ...result } = user;
    return result as User;
  }
}
