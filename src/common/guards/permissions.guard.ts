import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Authorizes a request against the permissions decorated on the route.
 *
 * Required strings come in two shapes:
 *   "hr.employee.create"       — caller must hold this key at any scope
 *   "hr.employee.read:ALL"     — caller must hold this key at scope ≥ requested
 *
 * The user's `permissions` array (from JWT) holds `key:scope` strings:
 *   "hr.employee.read:DEPARTMENT"
 *
 * Super admins carry the wildcard `*:ALL` and short-circuit every check.
 */
const SCOPE_ORDER: Record<string, number> = {
  OWN: 0,
  DEPARTMENT: 1,
  BRANCH: 2,
  ALL: 3,
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;
    if (user.isSuperAdmin) return true;

    const held: { key: string; scope: string }[] = (user.permissions ?? []).map((p: string) => {
      const [key, scope = 'ALL'] = p.split(':');
      return { key, scope };
    });

    // Wildcard support — `*` granted by super admins via the resolver.
    if (held.some((h) => h.key === '*')) return true;

    for (const r of required) {
      const [key, scope] = r.split(':');
      const matches = held.filter((h) => h.key === key);
      if (!matches.length) {
        throw new ForbiddenException(`Missing permission: ${key}`);
      }
      if (scope) {
        const need = SCOPE_ORDER[scope.toUpperCase()] ?? 3;
        const has = Math.max(...matches.map((m) => SCOPE_ORDER[m.scope.toUpperCase()] ?? 0));
        if (has < need) {
          throw new ForbiddenException(`Insufficient scope on ${key}: need ${scope}`);
        }
      }
    }

    return true;
  }
}
