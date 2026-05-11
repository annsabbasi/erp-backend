import { Injectable, Logger } from '@nestjs/common';
import { AuthEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuthRequestMeta {
  ip?: string;
  userAgent?: string;
}

/**
 * Writes auth lifecycle events (login, logout, refresh, lockout, MFA) to the
 * audit log. Failures are logged but never surfaced to the caller — auditing
 * must not break the user-facing flow.
 */
@Injectable()
export class AuthAuditService {
  private readonly logger = new Logger(AuthAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(params: {
    userId: string | null;
    type: AuthEventType;
    meta?: AuthRequestMeta;
    metadata?: Prisma.InputJsonValue;
  }): Promise<void> {
    try {
      await this.prisma.authEvent.create({
        data: {
          userId: params.userId ?? undefined,
          type: params.type,
          ip: params.meta?.ip,
          userAgent: params.meta?.userAgent,
          metadata: params.metadata,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to record auth event ${params.type}: ${(e as Error).message}`);
    }
  }

  async recordLoginAttempt(params: {
    email: string;
    companySlug?: string | null;
    userId: string | null;
    success: boolean;
    failureReason?: string | null;
    meta?: AuthRequestMeta;
  }): Promise<void> {
    try {
      await this.prisma.loginAttempt.create({
        data: {
          email: params.email,
          companySlug: params.companySlug ?? undefined,
          userId: params.userId ?? undefined,
          success: params.success,
          failureReason: params.failureReason ?? undefined,
          ip: params.meta?.ip,
          userAgent: params.meta?.userAgent,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to record login attempt: ${(e as Error).message}`);
    }
  }
}
