import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'secret',
    });
  }

  async validate(payload: JwtPayload) {
    // This object is attached to req.user and available via @CurrentUser()
    return {
      sub: payload.sub,
      email: payload.email,
      companyId: payload.companyId,
      isSuperAdmin: payload.isSuperAdmin,
      permissions: payload.permissions,
    };
  }
}
