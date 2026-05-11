import type { UserRoleType } from '@prisma/client';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  companyId: string | null;
  isSuperAdmin: boolean;
  roleType: UserRoleType;
  departmentId: string | null;
  branchId: string | null;
  permissions: string[];
  type: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
  type: 'refresh';
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
};
