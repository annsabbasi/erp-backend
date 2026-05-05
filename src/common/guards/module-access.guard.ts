import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_ACCESS_KEY } from '../decorators/module-access.decorator';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(MODULE_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;
    if (user.isSuperAdmin) return true;

    if (!user.enabledModuleSlugs?.includes(required)) {
      throw new ForbiddenException('Module access denied');
    }
    return true;
  }
}
