import { Injectable } from '@nestjs/common';
import { PermissionScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ResolvedPermission {
  key: string;
  scope: PermissionScope;
}

const SCOPE_ORDER: Record<PermissionScope, number> = {
  OWN: 0,
  DEPARTMENT: 1,
  BRANCH: 2,
  ALL: 3,
};

/**
 * Walks a user's roles and merges:
 *   • direct RolePermission rows (key + scope)
 *   • PermissionSets attached to those roles (each yields key + scope per item)
 *
 * Per (key), keeps the broadest scope held — so if a user has the same
 * permission at OWN via one role and ALL via another, the resolver returns ALL.
 *
 * The result is what we embed in the JWT and what the effective-permissions
 * endpoint returns.
 */
@Injectable()
export class PermissionResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForUser(userId: string): Promise<ResolvedPermission[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: { select: { key: true } } } },
                rolePermissionSets: {
                  include: {
                    set: {
                      include: {
                        items: { include: { permission: { select: { key: true } } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!user) return [];

    // Super admins short-circuit with the wildcard.
    if (user.isSuperAdmin) {
      return [{ key: '*', scope: PermissionScope.ALL }];
    }

    const merged = new Map<string, PermissionScope>();
    const upgrade = (key: string, scope: PermissionScope) => {
      const current = merged.get(key);
      if (!current || SCOPE_ORDER[scope] > SCOPE_ORDER[current]) {
        merged.set(key, scope);
      }
    };

    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        upgrade(rp.permission.key, rp.scope);
      }
      for (const rps of ur.role.rolePermissionSets) {
        for (const item of rps.set.items) {
          upgrade(item.permission.key, item.scope);
        }
      }
    }

    return [...merged.entries()].map(([key, scope]) => ({ key, scope }));
  }

  /**
   * Encodes resolved permissions for JWT embedding: "key:scope".
   * The PermissionsGuard accepts both bare "key" and "key:scope" required strings.
   */
  encode(resolved: ResolvedPermission[]): string[] {
    return resolved.map((r) => `${r.key}:${r.scope}`);
  }
}
