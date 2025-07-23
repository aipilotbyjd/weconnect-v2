import { User } from '../entities/user.entity';

export interface IUserRepository {
  create(user: Partial<User>): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: string, updates: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
  findByOrganizationId(organizationId: string): Promise<User[]>;
  updateLastLogin(id: string): Promise<void>;
  deactivate(id: string): Promise<void>;
  activate(id: string): Promise<void>;
}
