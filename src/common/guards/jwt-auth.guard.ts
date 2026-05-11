import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { TenantPrincipal } from '../context/tenant-context.service';

/**
 * Global JWT auth guard.
 *
 * - Skips entirely on routes marked `@Public()` (e.g. /auth/login, /auth/refresh).
 * - Otherwise enforces a valid access token via Passport.
 * - On success, copies the principal onto `req.tenantPrincipal` so the
 *   REQUEST-scoped TenantContextService can read it.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext): TUser {
    const result = super.handleRequest(err, user, info, context);
    if (result) {
      const request = context.switchToHttp().getRequest();
      const principal: TenantPrincipal = {
        userId: result.sub,
        email: result.email,
        companyId: result.companyId ?? null,
        roleType: result.roleType,
        isSuperAdmin: !!result.isSuperAdmin,
        departmentId: result.departmentId ?? null,
        branchId: result.branchId ?? null,
        permissions: result.permissions ?? [],
      };
      request.tenantPrincipal = principal;
    }
    return result;
  }
}
