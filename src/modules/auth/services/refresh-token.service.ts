import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthRequestMeta } from './auth-audit.service';

/**
 * Issues, validates, rotates, and revokes refresh tokens.
 *
 * The raw token is sent to the client only once (at issue time). We store
 * the SHA-256 hash so a DB read does not yield a usable credential. On each
 * refresh we revoke the presented token and chain the new one via
 * `replacedById` — if a revoked token is ever re-presented we can detect
 * theft and revoke the entire chain.
 */
@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async issue(userId: string, meta?: AuthRequestMeta) {
    const raw = randomBytes(48).toString('base64url');
    const tokenHash = this.hash(raw);
    const ttlMs = this.refreshTtlMs();

    const record = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + ttlMs),
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });

    return { rawToken: raw, record };
  }

  /**
   * Validates the presented refresh token. Throws if it is unknown, expired,
   * or already revoked. Returns the matching DB record on success.
   */
  async validate(rawToken: string) {
    const tokenHash = this.hash(rawToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) throw new UnauthorizedException('Invalid refresh token');
    if (record.revokedAt) {
      // Re-use of an already-revoked token: revoke the whole chain as a precaution.
      await this.revokeAllForUser(record.userId);
      throw new UnauthorizedException('Refresh token reuse detected — please sign in again');
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }
    if (!record.user || !record.user.isActive || record.user.deletedAt) {
      throw new UnauthorizedException('User no longer active');
    }
    return record;
  }

  async rotate(rawToken: string, meta?: AuthRequestMeta) {
    const current = await this.validate(rawToken);
    const issued = await this.issue(current.userId, meta);

    await this.prisma.refreshToken.update({
      where: { id: current.id },
      data: { revokedAt: new Date(), replacedById: issued.record.id },
    });

    return { user: current.user, ...issued };
  }

  async revoke(rawToken: string) {
    const tokenHash = this.hash(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private refreshTtlMs(): number {
    const expr = this.config.get<string>('jwt.refreshExpiresIn', '7d');
    return parseDurationMs(expr);
  }
}

/** Minimal "7d" / "15m" / "30s" / "12h" parser. Falls back to ms if numeric. */
export function parseDurationMs(input: string): number {
  const m = /^(\d+)\s*([smhd])?$/i.exec(input.trim());
  if (!m) {
    const n = Number(input);
    return Number.isFinite(n) ? n : 7 * 24 * 60 * 60 * 1000;
  }
  const value = parseInt(m[1], 10);
  const unit = (m[2] ?? 'd').toLowerCase();
  const multiplier =
    unit === 's' ? 1000 :
    unit === 'm' ? 60 * 1000 :
    unit === 'h' ? 60 * 60 * 1000 :
                   24 * 60 * 60 * 1000;
  return value * multiplier;
}
