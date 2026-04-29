import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { Role } from '../../common/decorators/roles.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = this.usersService.findByEmail(loginDto.email);
    if (!user || user.password !== loginDto.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        modules: user.modules,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existing = this.usersService.findByEmail(registerDto.email);
    if (existing) {
      throw new UnauthorizedException('User with this email already exists');
    }
    const newUser = this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      password: registerDto.password,
      role: registerDto.role || Role.USER,
      modules: registerDto.modules || [],
    });
    return { message: 'User registered successfully', user: newUser };
  }

  async getProfile(userId: number) {
    return this.usersService.findOne(userId);
  }
}
