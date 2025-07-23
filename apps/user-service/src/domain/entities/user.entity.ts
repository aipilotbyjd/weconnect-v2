import { User as PrismaUser, UserRole } from '../../../../../generated/prisma';

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    private _password: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly role: UserRole,
    public readonly organizationId?: string,
    public readonly isActive: boolean = true,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
    public readonly lastLoginAt?: Date
  ) {}

  // Domain methods
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get password(): string {
    return this._password;
  }

  updatePassword(hashedPassword: string): User {
    return new User(
      this.id,
      this.email,
      hashedPassword,
      this.firstName,
      this.lastName,
      this.role,
      this.organizationId,
      this.isActive,
      this.createdAt,
      new Date(), // updatedAt
      this.lastLoginAt
    );
  }

  updateLastLogin(): User {
    return new User(
      this.id,
      this.email,
      this._password,
      this.firstName,
      this.lastName,
      this.role,
      this.organizationId,
      this.isActive,
      this.createdAt,
      new Date(), // updatedAt
      new Date()  // lastLoginAt
    );
  }

  deactivate(): User {
    return new User(
      this.id,
      this.email,
      this._password,
      this.firstName,
      this.lastName,
      this.role,
      this.organizationId,
      false, // isActive
      this.createdAt,
      new Date(), // updatedAt
      this.lastLoginAt
    );
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  canAccessOrganization(organizationId: string): boolean {
    return this.organizationId === organizationId || this.isAdmin();
  }

  // Convert to Prisma format
  toPrisma(): Omit<PrismaUser, 'organization' | 'workflows' | 'executions' | 'credentials' | 'apiKeys'> {
    return {
      id: this.id,
      email: this.email,
      password: this._password,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      organizationId: this.organizationId ?? null,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt ?? null,
    };
  }

  // Create from Prisma
  static fromPrisma(prismaUser: PrismaUser): User {
    return new User(
      prismaUser.id,
      prismaUser.email,
      prismaUser.password,
      prismaUser.firstName,
      prismaUser.lastName,
      prismaUser.role,
      prismaUser.organizationId ?? undefined,
      prismaUser.isActive,
      prismaUser.createdAt,
      prismaUser.updatedAt,
      prismaUser.lastLoginAt ?? undefined
    );
  }

  // For safe serialization (without password)
  toSafeObject() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      role: this.role,
      organizationId: this.organizationId,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
    };
  }
}
