import { IsString, IsEmail, IsOptional, IsArray, IsBoolean, MinLength } from 'class-validator';

export class CreateHrUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  // Role IDs — must all be HR-domain roles. Validated by the service.
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleIds?: string[];
}

export class UpdateHrUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleIds?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
