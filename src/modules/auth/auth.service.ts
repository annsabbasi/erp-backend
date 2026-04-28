import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(loginDto: LoginDto) {
    // TODO: validate user against database
    const payload = { email: loginDto.email, sub: 1 };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(registerDto: RegisterDto) {
    // TODO: hash password and save user to database
    return { message: 'User registered successfully', email: registerDto.email };
  }

  async getProfile(userId: number) {
    // TODO: fetch from database
    return { id: userId };
  }
}
