import { Inject, Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import type { UserRoleType } from '@prisma/client';

/**
 * REQUEST-scoped holder of the caller's authenticated identity.
 *
 * This is the ONLY sanctioned place to read tenant/user info inside services —
 * never trust `companyId` from the request body or query string. Populated by
 * the JWT auth guard once the access token is verified.
 *
 * For unauthenticated requests (e.g. /auth/login), `user` is undefined.
 */
export interface TenantPrincipal {
  userId: string;
  email: string;
  companyId: string | null;
  roleType: UserRoleType;
  isSuperAdmin: boolean;
  departmentId: string | null;
  branchId: string | null;
  permissions: string[];
}

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  /** Returns the authenticated principal, or undefined if the request is anonymous. */
  get user(): TenantPrincipal | undefined {
    return (this.request as any).tenantPrincipal as TenantPrincipal | undefined;
  }

  /** Same as `user`, but throws if anonymous. Use inside protected services. */
  requireUser(): TenantPrincipal {
    const u = this.user;
    if (!u) throw new UnauthorizedException('Authentication required');
    return u;
  }

  /**
   * Returns the caller's company id. Throws if missing — every domain query
   * must be tenant-scoped, so this is the right default.
   */
  requireCompanyId(): string {
    const u = this.requireUser();
    if (!u.companyId) {
      throw new UnauthorizedException(
        'No company context — platform super admins must impersonate a company first',
      );
    }
    return u.companyId;
  }

  /** Convenience: caller is a platform super admin (no companyId). */
  get isSuperAdmin(): boolean {
    return !!this.user?.isSuperAdmin;
  }
}
