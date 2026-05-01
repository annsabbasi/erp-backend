import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  // Company slug the user will belong to
  @IsString()
  @IsOptional()
  companySlug?: string;
}
