import { IsEmail, IsString, IsOptional, MinLength, IsArray, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleIds?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
