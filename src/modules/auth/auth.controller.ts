import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, requestMeta(req));
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, requestMeta(req));
  }

  @Post('logout')
  logout(
    @Body() dto: Partial<RefreshTokenDto>,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.auth.logout(dto?.refreshToken, user?.sub ?? null, requestMeta(req));
  }

  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.auth.getProfile(user.sub);
  }

  @RequirePermission('administration.create')
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }
}

function requestMeta(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
    req.ip ||
    req.socket?.remoteAddress ||
    undefined;
  const userAgent = req.headers['user-agent'];
  return { ip, userAgent: typeof userAgent === 'string' ? userAgent : undefined };
}
