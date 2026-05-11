import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route as publicly accessible — bypasses the global JwtAuthGuard
 * and PermissionsGuard. Use only on auth endpoints (login/refresh) and
 * unauthenticated health/status endpoints.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
