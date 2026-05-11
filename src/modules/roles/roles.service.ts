import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PermissionScope, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionResolverService } from '../permissions/permission-resolver.service';
import { AuditService } from '../audit/audit.service';
import {
  CloneRoleDto,
  CreateRoleDto,
  RolePermissionAssignmentDto,
  UpdateRoleDto,
} from './dto/create-role.dto';

interface AuditContext {
  actorId: string | null;
  ip?: string;
}

/**
 * Roles + their attached permissions and permission sets.
 *
 * Every mutation writes an `ActivityLog` entry under module="iam" so the
 * Audit & Compliance module can render a per-role change history later.
 */
@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: PermissionResolverService,
    private readonly audit: AuditService,
  ) {}

  findAll(companyId: string) {
    return this.prisma.role.findMany({
      where: { companyId },
      include: this.fullInclude(),
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, companyId },
      include: this.fullInclude(),
    });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return role;
  }

  async create(dto: CreateRoleDto, companyId: string, audit: AuditContext) {
    const conflict = await this.prisma.role.findFirst({
      where: { name: dto.name, companyId },
    });
    if (conflict) throw new BadRequestException('Role name already exists in this company');

    const role = await this.prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          name: dto.name,
          description: dto.description,
          companyId,
          domain: dto.domain,
          isDefault: dto.isDefault ?? false,
          defaultScope: dto.defaultScope ?? PermissionScope.ALL,
        },
      });

      if (dto.permissions?.length) {
        await this.writeRolePermissions(tx, created.id, dto.permissions, created.defaultScope);
      }
      if (dto.permissionSetIds?.length) {
        await this.attachPermissionSets(tx, created.id, dto.permissionSetIds, companyId);
      }
      return created;
    });

    await this.recordActivity({
      companyId,
      actorId: audit.actorId,
      action: 'role.created',
      ip: audit.ip,
      details: { roleId: role.id, name: role.name },
    });

    return this.findOne(role.id, companyId);
  }

  async clone(sourceRoleId: string, dto: CloneRoleDto, companyId: string, audit: AuditContext) {
    const source = await this.findOne(sourceRoleId, companyId);
    const conflict = await this.prisma.role.findFirst({
      where: { name: dto.name, companyId },
    });
    if (conflict) throw new BadRequestException('Role name already exists in this company');

    const cloned = await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: dto.name,
          description: dto.description ?? source.description,
          companyId,
          domain: source.domain,
          isDefault: false,
          defaultScope: source.defaultScope,
          sourceRoleId: source.id,
        },
      });

      if (source.rolePermissions.length) {
        await tx.rolePermission.createMany({
          data: source.rolePermissions.map((rp) => ({
            roleId: role.id,
            permissionId: rp.permissionId,
            scope: rp.scope,
          })),
          skipDuplicates: true,
        });
      }
      if (source.rolePermissionSets.length) {
        await tx.rolePermissionSet.createMany({
          data: source.rolePermissionSets.map((rs) => ({
            roleId: role.id,
            setId: rs.setId,
          })),
          skipDuplicates: true,
        });
      }
      return role;
    });

    await this.recordActivity({
      companyId,
      actorId: audit.actorId,
      action: 'role.cloned',
      ip: audit.ip,
      details: { sourceRoleId: source.id, sourceName: source.name, newRoleId: cloned.id, newName: cloned.name },
    });

    return this.findOne(cloned.id, companyId);
  }

  async update(id: string, dto: UpdateRoleDto, companyId: string, audit: AuditContext) {
    const before = await this.findOne(id, companyId);

    if (dto.name && dto.name !== before.name) {
      const conflict = await this.prisma.role.findFirst({
        where: { name: dto.name, companyId, id: { not: id } },
      });
      if (conflict) throw new BadRequestException('Role name already exists in this company');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          name: dto.name ?? undefined,
          description: dto.description ?? undefined,
          domain: dto.domain ?? undefined,
          isDefault: dto.isDefault ?? undefined,
          defaultScope: dto.defaultScope ?? undefined,
        },
      });

      if (dto.permissions !== undefined) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await this.writeRolePermissions(
          tx,
          id,
          dto.permissions,
          dto.defaultScope ?? before.defaultScope,
        );
      }

      if (dto.permissionSetIds !== undefined) {
        await tx.rolePermissionSet.deleteMany({ where: { roleId: id } });
        if (dto.permissionSetIds.length) {
          await this.attachPermissionSets(tx, id, dto.permissionSetIds, companyId);
        }
      }
    });

    await this.recordActivity({
      companyId,
      actorId: audit.actorId,
      action: 'role.updated',
      ip: audit.ip,
      details: { roleId: id, fields: Object.keys(dto) },
    });

    return this.findOne(id, companyId);
  }

  async remove(id: string, companyId: string, audit: AuditContext) {
    const role = await this.findOne(id, companyId);
    await this.prisma.role.delete({ where: { id } });

    await this.recordActivity({
      companyId,
      actorId: audit.actorId,
      action: 'role.deleted',
      ip: audit.ip,
      details: { roleId: id, name: role.name },
    });

    return { message: `Role ${id} deleted` };
  }

  /**
   * Returns the catalog of platform permissions filtered to the modules the
   * company has activated, so the role editor only offers what's available.
   */
  async getAvailablePermissions(companyId: string) {
    const enabled = await this.prisma.companyModule.findMany({
      where: { companyId, isEnabled: true },
      include: { module: { select: { slug: true } } },
    });
    const slugs = enabled.map((c) => c.module.slug);

    return this.prisma.permission.findMany({
      where: { moduleSlug: { in: slugs } },
      orderBy: [{ moduleSlug: 'asc' }, { resource: 'asc' }, { action: 'asc' }],
    });
  }

  /** Live computed permissions for a user — what the spec calls the "effective-permissions preview". */
  async effectivePermissionsForUser(userId: string, companyId: string) {
    // Confirm the user belongs to this company (or is the caller themselves).
    const user = await this.prisma.user.findFirst({
      where: { id: userId, OR: [{ companyId }, { isSuperAdmin: true }] },
      select: { id: true, companyId: true, isSuperAdmin: true },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found in this company`);

    const resolved = await this.resolver.resolveForUser(userId);
    return { userId, permissions: resolved };
  }

  // ── INTERNAL ───────────────────────────────────────────────────────────────
  private async writeRolePermissions(
    tx: Prisma.TransactionClient,
    roleId: string,
    items: RolePermissionAssignmentDto[],
    defaultScope: PermissionScope,
  ) {
    if (!items.length) return;
    const keys = items.map((i) => i.permissionKey);
    const perms = await tx.permission.findMany({ where: { key: { in: keys } } });
    const byKey = new Map(perms.map((p) => [p.key, p.id]));
    const missing = keys.filter((k) => !byKey.has(k));
    if (missing.length) {
      throw new BadRequestException(`Unknown permission keys: ${missing.join(', ')}`);
    }

    await tx.rolePermission.createMany({
      data: items.map((i) => ({
        roleId,
        permissionId: byKey.get(i.permissionKey)!,
        scope: i.scope ?? defaultScope,
      })),
      skipDuplicates: true,
    });
  }

  private async attachPermissionSets(
    tx: Prisma.TransactionClient,
    roleId: string,
    setIds: string[],
    companyId: string,
  ) {
    const sets = await tx.permissionSet.findMany({
      where: {
        id: { in: setIds },
        OR: [{ isSystem: true }, { companyId }],
      },
      select: { id: true },
    });
    const valid = new Set(sets.map((s) => s.id));
    const invalid = setIds.filter((s) => !valid.has(s));
    if (invalid.length) {
      throw new BadRequestException(`Permission sets not found: ${invalid.join(', ')}`);
    }
    await tx.rolePermissionSet.createMany({
      data: setIds.map((setId) => ({ roleId, setId })),
      skipDuplicates: true,
    });
  }

  private async recordActivity(params: {
    companyId: string;
    actorId: string | null;
    action: string;
    ip?: string;
    details: Prisma.InputJsonValue;
  }) {
    const refId = (params.details as any)?.roleId as string | undefined;
    await this.audit.record({
      companyId: params.companyId,
      actorId: params.actorId,
      action: params.action,
      refType: 'role',
      refId,
      after: params.details,
      ip: params.ip,
      module: 'iam',
      details: params.details,
    });
  }

  private fullInclude() {
    return {
      _count: { select: { userRoles: true } },
      rolePermissions: { include: { permission: true } },
      rolePermissionSets: { include: { set: { include: { items: { include: { permission: true } } } } } },
    } as const;
  }
}
