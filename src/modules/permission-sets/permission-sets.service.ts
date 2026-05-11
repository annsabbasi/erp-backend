import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PermissionScope, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePermissionSetDto,
  PermissionSetItemDto,
  ReplaceItemsDto,
  UpdatePermissionSetDto,
} from './dto/permission-set.dto';

/**
 * Custom and system permission sets.
 *
 *   • System sets are platform-wide templates (companyId = null, isSystem = true)
 *     and are read-only from a tenant's perspective.
 *   • Company sets live under a tenant's companyId. Company Admins (or anyone
 *     with system.permission_set.manage) can create/edit/delete them.
 *
 * Listing returns both system sets and the caller's company sets so the role
 * editor UI can present a single tree.
 */
@Injectable()
export class PermissionSetsService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.permissionSet.findMany({
      where: { OR: [{ isSystem: true }, { companyId }] },
      include: { items: { include: { permission: true } } },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, companyId: string) {
    const set = await this.prisma.permissionSet.findFirst({
      where: {
        id,
        OR: [{ isSystem: true }, { companyId }],
      },
      include: { items: { include: { permission: true } } },
    });
    if (!set) throw new NotFoundException(`Permission set ${id} not found`);
    return set;
  }

  async create(dto: CreatePermissionSetDto, companyId: string) {
    const existing = await this.prisma.permissionSet.findFirst({
      where: { name: dto.name, companyId },
    });
    if (existing) {
      throw new BadRequestException('A permission set with this name already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const set = await tx.permissionSet.create({
        data: {
          name: dto.name,
          description: dto.description,
          companyId,
          isSystem: false,
        },
      });

      if (dto.items?.length) {
        await this.writeItems(tx, set.id, dto.items);
      }

      return tx.permissionSet.findUnique({
        where: { id: set.id },
        include: { items: { include: { permission: true } } },
      });
    });
  }

  async update(id: string, dto: UpdatePermissionSetDto, companyId: string) {
    const set = await this.findOne(id, companyId);
    if (set.isSystem) {
      throw new ForbiddenException('System permission sets are immutable');
    }

    if (dto.name && dto.name !== set.name) {
      const conflict = await this.prisma.permissionSet.findFirst({
        where: { name: dto.name, companyId, id: { not: id } },
      });
      if (conflict) throw new BadRequestException('A permission set with this name already exists');
    }

    await this.prisma.permissionSet.update({
      where: { id },
      data: { name: dto.name ?? undefined, description: dto.description ?? undefined },
    });
    return this.findOne(id, companyId);
  }

  async replaceItems(id: string, dto: ReplaceItemsDto, companyId: string) {
    const set = await this.findOne(id, companyId);
    if (set.isSystem) {
      throw new ForbiddenException('System permission sets are immutable');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.permissionSetItem.deleteMany({ where: { setId: id } });
      await this.writeItems(tx, id, dto.items);
    });
    return this.findOne(id, companyId);
  }

  async remove(id: string, companyId: string) {
    const set = await this.findOne(id, companyId);
    if (set.isSystem) {
      throw new ForbiddenException('System permission sets cannot be deleted');
    }

    const inUse = await this.prisma.rolePermissionSet.count({ where: { setId: id } });
    if (inUse) {
      throw new BadRequestException(
        `Cannot delete: this set is still attached to ${inUse} role(s)`,
      );
    }

    await this.prisma.permissionSet.delete({ where: { id } });
    return { message: `Permission set ${id} deleted` };
  }

  private async writeItems(
    tx: Prisma.TransactionClient,
    setId: string,
    items: PermissionSetItemDto[],
  ) {
    if (!items.length) return;
    const keys = items.map((i) => i.permissionKey);
    const perms = await tx.permission.findMany({ where: { key: { in: keys } } });
    const byKey = new Map(perms.map((p) => [p.key, p.id]));

    const missing = keys.filter((k) => !byKey.has(k));
    if (missing.length) {
      throw new BadRequestException(`Unknown permission keys: ${missing.join(', ')}`);
    }

    await tx.permissionSetItem.createMany({
      data: items.map((i) => ({
        setId,
        permissionId: byKey.get(i.permissionKey)!,
        scope: i.scope ?? PermissionScope.ALL,
      })),
      skipDuplicates: true,
    });
  }
}
