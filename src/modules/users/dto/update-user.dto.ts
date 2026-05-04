import { IsEmail, IsString, IsOptional, MinLength, IsArray, IsBoolean, IsEnum } from 'class-validator';
import { UserRoleType } from '@prisma/client';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

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
