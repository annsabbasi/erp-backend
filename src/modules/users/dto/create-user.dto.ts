import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../../common/decorators/roles.decorator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
