import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';
import { Role } from '../../../common/decorators/roles.decorator';

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(Role)
  role: Role;
}
