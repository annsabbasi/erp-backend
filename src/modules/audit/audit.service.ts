import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditRecordInput {
  companyId: string | null;
  actorId: string | null;
  action: string;
  refType?: string;
  refId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  /**
   * Optional informational copy for the activity log. If true, write a parallel
   * row to ActivityLog (high-volume, queryable). Defaults to true.
   */
  alsoActivityLog?: boolean;
  /** Module bucket for ActivityLog grouping. */
  module?: string;
  /** Free-form details for ActivityLog (audit's before/after stays separate). */
  details?: Prisma.InputJsonValue;
}

/**
 * Centralized recorder for the immutable audit trail (Section 6.12).
 *
 *   • Every write computes a SHA-256 hash over the canonicalized record.
 *   • Each event chains to the prior event for the same company via
 *     `chainHash` — tampering with one row breaks the chain from there on.
 *   • Optional ActivityLog mirror so existing /activity views keep working.
 *
 * Audit failures are logged but never propagate; auditing must not break the
 * user-facing flow.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditRecordInput): Promise<void> {
    try {
      const last = await this.prisma.auditEvent.findFirst({
        where: { companyId: input.companyId ?? undefined },
        orderBy: { at: 'desc' },
        select: { hash: true },
      });

      const at = new Date();
      const canonical = canonicalize({
        companyId: input.companyId ?? null,
        actorId: input.actorId ?? null,
        action: input.action,
        refType: input.refType ?? null,
        refId: input.refId ?? null,
        before: input.before ?? null,
        after: input.after ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        requestId: input.requestId ?? null,
        chainHash: last?.hash ?? null,
        at: at.toISOString(),
      });
      const hash = sha256(canonical);

      await this.prisma.auditEvent.create({
        data: {
          companyId: input.companyId ?? undefined,
          actorId: input.actorId ?? undefined,
          action: input.action,
          refType: input.refType,
          refId: input.refId,
          before: input.before === undefined ? undefined : (input.before as Prisma.InputJsonValue),
          after: input.after === undefined ? undefined : (input.after as Prisma.InputJsonValue),
          ip: input.ip,
          userAgent: input.userAgent,
          requestId: input.requestId,
          hash,
          chainHash: last?.hash ?? null,
          at,
        },
      });

      if (input.alsoActivityLog !== false) {
        await this.prisma.activityLog.create({
          data: {
            companyId: input.companyId ?? undefined,
            userId: input.actorId ?? undefined,
            action: input.action,
            module: input.module,
            details: input.details ?? (input.refId ? ({ refType: input.refType, refId: input.refId } as Prisma.InputJsonValue) : undefined),
            ipAddress: input.ip,
          },
        });
      }
    } catch (e) {
      this.logger.warn(`audit.record failed (${input.action}): ${(e as Error).message}`);
    }
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  async list(opts: {
    companyId?: string;
    actorId?: string;
    action?: string;
    refType?: string;
    refId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 50));
    const where: Prisma.AuditEventWhereInput = {
      ...(opts.companyId ? { companyId: opts.companyId } : {}),
      ...(opts.actorId ? { actorId: opts.actorId } : {}),
      ...(opts.action ? { action: opts.action } : {}),
      ...(opts.refType ? { refType: opts.refType } : {}),
      ...(opts.refId ? { refId: opts.refId } : {}),
      ...(opts.from || opts.to
        ? { at: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditEvent.count({ where }),
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, page, pageSize, items };
  }

  findOne(id: string) {
    return this.prisma.auditEvent.findUnique({ where: { id } });
  }

  /**
   * Compliance bundle export. Returns a JSON envelope containing every event
   * type relevant to an audit cycle, plus an `integrityHash` over the
   * canonicalized payload.
   */
  async exportBundle(opts: { companyId?: string; from?: Date; to?: Date }) {
    const window: Prisma.DateTimeFilter = {
      ...(opts.from ? { gte: opts.from } : {}),
      ...(opts.to ? { lte: opts.to } : {}),
    };
    const auditWhere: Prisma.AuditEventWhereInput = {
      ...(opts.companyId ? { companyId: opts.companyId } : {}),
      ...(opts.from || opts.to ? { at: window } : {}),
    };
    const activityWhere: Prisma.ActivityLogWhereInput = {
      ...(opts.companyId ? { companyId: opts.companyId } : {}),
      ...(opts.from || opts.to ? { createdAt: window } : {}),
    };
    const authWhere: Prisma.AuthEventWhereInput = {
      ...(opts.from || opts.to ? { at: window } : {}),
    };
    const loginWhere: Prisma.LoginAttemptWhereInput = {
      ...(opts.from || opts.to ? { attemptedAt: window } : {}),
    };

    const [auditEvents, activityLogs, authEvents, loginAttempts] = await Promise.all([
      this.prisma.auditEvent.findMany({ where: auditWhere, orderBy: { at: 'asc' } }),
      this.prisma.activityLog.findMany({ where: activityWhere, orderBy: { createdAt: 'asc' } }),
      this.prisma.authEvent.findMany({ where: authWhere, orderBy: { at: 'asc' } }),
      this.prisma.loginAttempt.findMany({ where: loginWhere, orderBy: { attemptedAt: 'asc' } }),
    ]);

    const meta = {
      companyId: opts.companyId ?? null,
      from: opts.from?.toISOString() ?? null,
      to: opts.to?.toISOString() ?? null,
      generatedAt: new Date().toISOString(),
      counts: {
        auditEvents: auditEvents.length,
        activityLogs: activityLogs.length,
        authEvents: authEvents.length,
        loginAttempts: loginAttempts.length,
      },
    };

    const bundle = { meta, auditEvents, activityLogs, authEvents, loginAttempts };
    const integrityHash = sha256(canonicalize(bundle));
    return { ...bundle, integrityHash };
  }

  /**
   * Verifies the chainHash chain for a company is unbroken (manual integrity
   * check; the audit UI can call this).
   */
  async verifyChain(companyId: string | null): Promise<{ ok: boolean; firstBreakAt?: string }> {
    const events = await this.prisma.auditEvent.findMany({
      where: { companyId: companyId ?? undefined },
      orderBy: { at: 'asc' },
    });
    let prevHash: string | null = null;
    for (const e of events) {
      if ((e.chainHash ?? null) !== prevHash) {
        return { ok: false, firstBreakAt: e.at.toISOString() };
      }
      prevHash = e.hash;
    }
    return { ok: true };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Stable JSON serialization with sorted keys — required so a hash is reproducible. */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => canonicalize(v)).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}
