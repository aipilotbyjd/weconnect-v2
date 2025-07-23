import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UserServiceClient implements OnModuleInit {
  private client: ClientProxy;

  onModuleInit() {
    this.client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3002,
      },
    });
  }

  async register(registerDto: RegisterDto) {
    return this.client.send('user.register', registerDto).toPromise();
  }

  async login(loginDto: LoginDto) {
    return this.client.send('user.login', loginDto).toPromise();
  }

  async getUserById(id: string) {
    return this.client.send('user.findById', { id }).toPromise();
  }

  async getUserByEmail(email: string) {
    return this.client.send('user.findByEmail', { email }).toPromise();
  }

  async updateUser(id: string, updates: UpdateUserDto) {
    return this.client.send('user.update', { id, updates }).toPromise();
  }

  async deleteUser(id: string) {
    return this.client.send('user.delete', { id }).toPromise();
  }

  async getUsersByOrganization(organizationId: string) {
    return this.client.send('user.findByOrganization', { organizationId }).toPromise();
  }

  async activateUser(id: string) {
    return this.client.send('user.activate', { id }).toPromise();
  }

  async deactivateUser(id: string) {
    return this.client.send('user.deactivate', { id }).toPromise();
  }

  async validateToken(token: string) {
    return this.client.send('user.validateToken', { token }).toPromise();
  }

  async refreshToken(userId: string) {
    return this.client.send('user.refreshToken', { userId }).toPromise();
  }
}
