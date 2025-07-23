import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from './register.dto';

export class UpdateUserDto {
  @ApiProperty({
    description: 'User first name (optional)',
    example: 'John',
    required: false
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: 'User last name (optional)',
    example: 'Doe',
    required: false
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: 'Organization ID (optional)',
    example: 'clxxxxxxxxxxxxxxx',
    required: false
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({
    description: 'User role (optional)',
    enum: UserRole,
    example: UserRole.USER,
    required: false
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({
    description: 'User active status (optional)',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
