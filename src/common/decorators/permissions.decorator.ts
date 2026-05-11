import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Gates a route on one or more permission keys.
 *
 *   @RequirePermission('hr.employee.create')
 *     — caller must hold the key at any scope.
 *
 *   @RequirePermission('hr.employee.read:ALL')
 *     — caller must hold the key at scope ≥ ALL (i.e. cross-tenant read).
 *
 *   @RequirePermission('a', 'b')
 *     — caller must hold BOTH a and b. Multi-permission OR is not supported
 *       at the decorator level; encode it as a higher-level permission instead.
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Convenience: restrict a route to platform super-admins only.
 * The PermissionsGuard short-circuits on isSuperAdmin before checking
 * required keys, so this is satisfied only by users with isSuperAdmin=true.
 */
export const SuperAdminOnly = () => RequirePermission('platform.superadmin');
