import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

export interface PrivacyAuditMeta {
  actorId: string | null;
  ip?: string;
}

/**
 * Implements GDPR-style Subject Access (export) and Right-to-Erasure (anonymize)
 * for users (Section 13.5).
 *
 *   • Export gathers: User profile, AuthEvents, LoginAttempts, ActivityLogs the
 *     user triggered, AuditEvents the user was actor of, Employee record (if any).
 *   • Erase replaces PII (email, name) with placeholders, sets `deletedAt` and
 *     `isActive=false`, scrambles the password hash, revokes all refresh tokens.
 *     Audit/AuthEvent rows are kept (anonymized via the user's userId still
 *     pointing to the now-anonymous user) so the audit chain stays intact.
 */
@Injectable()
export class PrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async exportSubject(userId: string, scopeCompanyId: string | null, audit: PrivacyAuditMeta) {
    const user = await this.findScopedUser(userId, scopeCompanyId);

    const [authEvents, loginAttempts, activityLogs, auditEvents, employee] = await Promise.all([
      this.prisma.authEvent.findMany({ where: { userId }, orderBy: { at: 'asc' } }),
      this.prisma.loginAttempt.findMany({ where: { userId }, orderBy: { attemptedAt: 'asc' } }),
      this.prisma.activityLog.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.auditEvent.findMany({ where: { actorId: userId }, orderBy: { at: 'asc' } }),
      // Employee link is opportunistic — the field is not yet populated by current
      // HR flows but exists in schema; fetching by email keeps us forward-compat.
      this.prisma.employee.findFirst({ where: { email: user.email, companyId: user.companyId ?? undefined } }),
    ]);

    const bundle = {
      meta: {
        subjectUserId: userId,
        generatedAt: new Date().toISOString(),
        counts: {
          authEvents: authEvents.length,
          loginAttempts: loginAttempts.length,
          activityLogs: activityLogs.length,
          auditEvents: auditEvents.length,
        },
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyId: user.companyId,
        roleType: user.roleType,
        departmentId: user.departmentId,
        branchId: user.branchId,
        isSuperAdmin: user.isSuperAdmin,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      employee,
      authEvents,
      loginAttempts,
      activityLogs,
      auditEvents,
    };

    await this.audit.record({
      companyId: user.companyId ?? null,
      actorId: audit.actorId,
      action: 'privacy.subject_exported',
      refType: 'user',
      refId: userId,
      ip: audit.ip,
      module: 'privacy',
    });

    return bundle;
  }

  async eraseSubject(userId: string, scopeCompanyId: string | null, audit: PrivacyAuditMeta) {
    const user = await this.findScopedUser(userId, scopeCompanyId);
    if (user.isSuperAdmin) {
      throw new BadRequestException('Refusing to erase a platform super admin');
    }

    const placeholderEmail = `erased-${randomUUID()}@erased.local`;
    const before = {
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      deletedAt: user.deletedAt,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email: placeholderEmail,
          name: '[Erased User]',
          isActive: false,
          deletedAt: new Date(),
          // Scramble the hash so the credential is unusable; keeps the column NOT NULL.
          passwordHash: `erased-${randomUUID()}`,
          mfaEnabled: false,
          mfaSecret: null,
        },
      });
      // Revoke all outstanding refresh tokens immediately.
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    await this.audit.record({
      companyId: user.companyId ?? null,
      actorId: audit.actorId,
      action: 'privacy.subject_erased',
      refType: 'user',
      refId: userId,
      before,
      after: { email: placeholderEmail, name: '[Erased User]', isActive: false },
      ip: audit.ip,
      module: 'privacy',
    });

    return { ok: true, userId, anonymizedEmail: placeholderEmail };
  }

  private async findScopedUser(userId: string, scopeCompanyId: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    if (scopeCompanyId && user.companyId !== scopeCompanyId) {
      // Don't leak existence across tenants.
      throw new NotFoundException(`User ${userId} not found`);
    }
    return user;
  }
}
