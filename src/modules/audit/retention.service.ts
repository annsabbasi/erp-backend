import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Per-class default retention windows (days). Overridable per-tenant via the
 * `retention_policies` table; the runner reads from that table first.
 */
export const DEFAULT_RETENTION_DAYS: Record<string, number> = {
  auth_event: 365,            // 1 year
  login_attempt: 90,
  activity_log: 90,
  audit_event: 365 * 7,       // 7 years for compliance
};

export interface RetentionResult {
  dataClass: string;
  retentionDays: number;
  cutoff: string;
  deleted: number;
}

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reads `RetentionPolicy` rows (with platform defaults as fallback) and
   * deletes rows older than each policy's retention window. Returns a per-
   * class summary so the admin endpoint can show what was cleaned.
   *
   * NOTE: AuditEvent deletion intentionally does NOT clear `chainHash` on
   * subsequent events. The chain becomes unverifiable across the gap, which
   * is acceptable here because retention is an explicit, audited decision.
   */
  async enforce(): Promise<RetentionResult[]> {
    const policies = await this.prisma.retentionPolicy.findMany({ where: { isEnforced: true } });
    const byClass = new Map<string, number>();
    for (const p of policies) byClass.set(p.dataClass, p.retentionDays);
    for (const [k, v] of Object.entries(DEFAULT_RETENTION_DAYS)) {
      if (!byClass.has(k)) byClass.set(k, v);
    }

    const results: RetentionResult[] = [];
    for (const [dataClass, retentionDays] of byClass.entries()) {
      const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
      const deleted = await this.deleteOlderThan(dataClass, cutoff);
      results.push({
        dataClass,
        retentionDays,
        cutoff: cutoff.toISOString(),
        deleted,
      });
    }
    return results;
  }

  list() {
    return this.prisma.retentionPolicy.findMany({ orderBy: { dataClass: 'asc' } });
  }

  async upsert(dataClass: string, retentionDays: number, isEnforced = true, notes?: string) {
    return this.prisma.retentionPolicy.upsert({
      where: { dataClass },
      update: { retentionDays, isEnforced, notes },
      create: { dataClass, retentionDays, isEnforced, notes },
    });
  }

  private async deleteOlderThan(dataClass: string, cutoff: Date): Promise<number> {
    switch (dataClass) {
      case 'auth_event':
        return (await this.prisma.authEvent.deleteMany({ where: { at: { lt: cutoff } } })).count;
      case 'login_attempt':
        return (await this.prisma.loginAttempt.deleteMany({ where: { attemptedAt: { lt: cutoff } } })).count;
      case 'activity_log':
        return (await this.prisma.activityLog.deleteMany({ where: { createdAt: { lt: cutoff } } })).count;
      case 'audit_event':
        return (await this.prisma.auditEvent.deleteMany({ where: { at: { lt: cutoff } } })).count;
      default:
        this.logger.warn(`Unknown retention dataClass: ${dataClass}`);
        return 0;
    }
  }
}
