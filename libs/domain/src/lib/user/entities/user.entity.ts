export class User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationId: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
