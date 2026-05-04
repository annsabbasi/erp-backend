import { IsEmail, IsString, IsOptional, MinLength, IsArray, IsBoolean, IsEnum } from 'class-validator';
import { UserRoleType } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserRoleType)
  @IsOptional()
  roleType?: UserRoleType;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  moduleIds?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
