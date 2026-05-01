import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

// Usage: @RequirePermission('hr:VIEW', 'hr:CREATE')
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Restricts a route to super-admins only.
// The PermissionsGuard short-circuits for isSuperAdmin before the permission check,
// so regular users (who never hold '*:*') will always receive 403.
export const SuperAdminOnly = () => RequirePermission('*:*');
