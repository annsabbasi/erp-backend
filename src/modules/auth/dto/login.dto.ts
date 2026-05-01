import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(4)
  password: string;

  // Company slug required for non-super-admin logins (e.g. "demo")
  @IsString()
  @IsOptional()
  companySlug?: string;
}
