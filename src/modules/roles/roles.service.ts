import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.role.findMany({
      where: { companyId },
      include: {
        _count: { select: { userRoles: true } },
        rolePermissions: { include: { permission: { include: { module: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, companyId },
      include: {
        rolePermissions: { include: { permission: { include: { module: true } } } },
        userRoles: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return role;
  }

  async create(dto: CreateRoleDto, companyId: string) {
    const existing = await this.prisma.role.findFirst({ where: { name: dto.name, companyId } });
    if (existing) throw new BadRequestException('Role name already exists in this company');

    const role = await this.prisma.role.create({
      data: { name: dto.name, description: dto.description, isDefault: dto.isDefault ?? false, companyId },
    });

    if (dto.permissionIds?.length) {
      await this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map(permissionId => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }

    return this.findOne(role.id, companyId);
  }

  async update(id: string, dto: Partial<CreateRoleDto>, companyId: string) {
    await this.findOne(id, companyId);
    const { permissionIds, ...rest } = dto;

    await this.prisma.role.update({ where: { id }, data: rest });

    if (permissionIds !== undefined) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissionIds.length) {
        await this.prisma.rolePermission.createMany({
          data: permissionIds.map(permissionId => ({ roleId: id, permissionId })),
          skipDuplicates: true,
        });
      }
    }

    return this.findOne(id, companyId);
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.prisma.role.delete({ where: { id } });
    return { message: `Role ${id} deleted` };
  }

  // Return all permissions available for a company's enabled modules
  async getAvailablePermissions(companyId: string) {
    const companyModules = await this.prisma.companyModule.findMany({
      where: { companyId, isEnabled: true },
      select: { moduleId: true },
    });
    const moduleIds = companyModules.map(cm => cm.moduleId);

    return this.prisma.permission.findMany({
      where: { moduleId: { in: moduleIds } },
      include: { module: true },
      orderBy: [{ module: { name: 'asc' } }, { action: 'asc' }],
    });
  }
}
