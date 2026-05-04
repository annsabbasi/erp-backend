import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PermissionAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHrRoleDto } from './dto/create-hr-role.dto';
import { CreateHrUserDto, UpdateHrUserDto } from './dto/create-hr-user.dto';

const HR_DOMAIN = 'HR';
const HR_MODULE_SLUGS = ['hr', 'hr-payroll', 'hr-employee-records', 'hr-attendance', 'hr-recruitment'];

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  // ── HR Role Management ────────────────────────────────────────────────────

  findAllHrRoles(companyId: string) {
    return this.prisma.role.findMany({
      where: { companyId, domain: HR_DOMAIN },
      include: {
        _count: { select: { userRoles: true } },
        rolePermissions: { include: { permission: { include: { module: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOneHrRole(id: string, companyId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, companyId, domain: HR_DOMAIN },
      include: {
        rolePermissions: { include: { permission: { include: { module: true } } } },
        userRoles: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!role) throw new NotFoundException(`HR role ${id} not found`);
    return role;
  }

  async createHrRole(dto: CreateHrRoleDto, companyId: string) {
    const existing = await this.prisma.role.findFirst({ where: { name: dto.name, companyId } });
    if (existing) throw new BadRequestException('Role name already exists in this company');

    if (dto.permissionIds?.length) {
      await this.assertHrPermissionsOnly(dto.permissionIds);
    }

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        isDefault: dto.isDefault ?? false,
        companyId,
        domain: HR_DOMAIN,
      },
    });

    if (dto.permissionIds?.length) {
      await this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map(permissionId => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }

    return this.findOneHrRole(role.id, companyId);
  }

  async updateHrRole(id: string, dto: Partial<CreateHrRoleDto>, companyId: string) {
    await this.findOneHrRole(id, companyId);

    if (dto.permissionIds?.length) {
      await this.assertHrPermissionsOnly(dto.permissionIds);
    }

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

    return this.findOneHrRole(id, companyId);
  }

  async removeHrRole(id: string, companyId: string) {
    await this.findOneHrRole(id, companyId);
    await this.prisma.role.delete({ where: { id } });
    return { message: `HR role ${id} deleted` };
  }

  // ── HR Permission Discovery ───────────────────────────────────────────────

  async getHrAvailablePermissions(companyId: string) {
    // Only return permissions for HR-domain modules that are enabled for this company
    const companyModules = await this.prisma.companyModule.findMany({
      where: { companyId, isEnabled: true },
      include: { module: { select: { slug: true } } },
    });
    const enabledHrSlugs = companyModules
      .map(cm => cm.module.slug)
      .filter(slug => HR_MODULE_SLUGS.includes(slug));

    return this.prisma.permission.findMany({
      where: { module: { slug: { in: enabledHrSlugs } } },
      include: { module: true },
      orderBy: [{ module: { name: 'asc' } }, { action: 'asc' }],
    });
  }

  // ── HR User Management ────────────────────────────────────────────────────

  findHrUsers(companyId: string) {
    return this.prisma.user.findMany({
      where: {
        companyId,
        deletedAt: null,
        userRoles: { some: { role: { domain: HR_DOMAIN } } },
      },
      select: {
        id: true, name: true, email: true, isActive: true, createdAt: true,
        roleType: true, departmentId: true,
        department: { select: { id: true, name: true } },
        userRoles: {
          where: { role: { domain: HR_DOMAIN } },
          select: { role: { select: { id: true, name: true, domain: true } } },
        },
        userModules: { select: { module: { select: { id: true, name: true, slug: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneHrUser(id: string, companyId: string) {
    const user = await this.fetchHrUserData(id, companyId);
    if (!user) throw new NotFoundException(`HR user ${id} not found`);

    if (user.userRoles.length === 0) {
      throw new ForbiddenException(`User ${id} does not belong to the HR domain`);
    }

    return user;
  }

  private async fetchHrUserData(id: string, companyId: string) {
    return this.prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
      select: {
        id: true, name: true, email: true, isActive: true, createdAt: true,
        roleType: true, departmentId: true,
        department: { select: { id: true, name: true } },
        userRoles: {
          where: { role: { domain: HR_DOMAIN } },
          select: { role: { select: { id: true, name: true, domain: true } } },
        },
        userModules: { select: { module: { select: { id: true, name: true, slug: true } } } },
      },
    });
  }

  async createHrUser(dto: CreateHrUserDto, companyId: string) {
    if (!dto.roleIds?.length) {
      throw new BadRequestException('At least one HR role must be assigned when creating an HR user');
    }

    const existing = await this.prisma.user.findFirst({ where: { email: dto.email, companyId } });
    if (existing) throw new BadRequestException('Email already in use in this company');

    await this.assertHrRolesOnly(dto.roleIds, companyId);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash, companyId, departmentId: dto.departmentId },
    });

    if (dto.roleIds?.length) {
      await this.prisma.userRole.createMany({
        data: dto.roleIds.map(roleId => ({ userId: user.id, roleId })),
        skipDuplicates: true,
      });
    }

    // Auto-assign HR modules to the new user
    const hrModules = await this.prisma.systemModule.findMany({
      where: { slug: { in: HR_MODULE_SLUGS } },
    });
    await this.prisma.userModule.createMany({
      data: hrModules.map(mod => ({ userId: user.id, moduleId: mod.id })),
      skipDuplicates: true,
    });

    return this.findOneHrUser(user.id, companyId);
  }

  async updateHrUser(id: string, dto: UpdateHrUserDto, companyId: string) {
    // Use the domain-enforcing lookup to confirm the user is an HR user before mutating.
    await this.findOneHrUser(id, companyId);

    if (dto.roleIds !== undefined && dto.roleIds.length === 0) {
      throw new BadRequestException('An HR user must retain at least one HR role');
    }
    if (dto.roleIds?.length) {
      await this.assertHrRolesOnly(dto.roleIds, companyId);
    }

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.email) data.email = dto.email;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);
    if (typeof dto.isActive === 'boolean') data.isActive = dto.isActive;
    if (dto.departmentId !== undefined) data.departmentId = dto.departmentId;

    await this.prisma.user.update({ where: { id }, data });

    if (dto.roleIds !== undefined) {
      // Only remove HR-domain roles; preserve any non-HR roles the user may hold.
      const currentHrRoles = await this.prisma.userRole.findMany({
        where: { userId: id, role: { domain: HR_DOMAIN } },
        select: { roleId: true },
      });
      const currentHrRoleIds = currentHrRoles.map(r => r.roleId);
      if (currentHrRoleIds.length) {
        await this.prisma.userRole.deleteMany({
          where: { userId: id, roleId: { in: currentHrRoleIds } },
        });
      }
      await this.prisma.userRole.createMany({
        data: dto.roleIds.map(roleId => ({ userId: id, roleId })),
        skipDuplicates: true,
      });
    }

    // Use the plain fetch so the response reflects the actual current state
    // regardless of role changes — domain enforcement already happened above.
    const updated = await this.fetchHrUserData(id, companyId);
    if (!updated) throw new NotFoundException(`HR user ${id} not found after update`);
    return updated;
  }

  async removeHrUser(id: string, companyId: string) {
    await this.findOneHrUser(id, companyId);
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: `HR user ${id} deactivated` };
  }

  // ── Seed Default HR Roles for a Company ──────────────────────────────────

  async seedDefaultHrRoles(companyId: string) {
    const hrModules = await this.prisma.systemModule.findMany({
      where: { slug: { in: HR_MODULE_SLUGS } },
    });
    const hrModuleIds = hrModules.map(m => m.id);
    const allHrPerms = await this.prisma.permission.findMany({ where: { moduleId: { in: hrModuleIds } } });
    const hrViewPerms = allHrPerms.filter(p => p.action === PermissionAction.VIEW);
    const hrCudPerms = allHrPerms.filter(p => p.action !== PermissionAction.MANAGE);

    const roles = [
      {
        name: 'HR Admin',
        description: 'Full control over all HR modules and configurations',
        permissions: allHrPerms,
      },
      {
        name: 'HR Manager',
        description: 'Elevated HR access: manage HR users and assign HR roles',
        permissions: hrCudPerms,
      },
      {
        name: 'HR Viewer',
        description: 'Read-only access to authorized HR data',
        permissions: hrViewPerms,
      },
    ];

    const seeded: string[] = [];
    for (const r of roles) {
      const existing = await this.prisma.role.findFirst({ where: { name: r.name, companyId } });
      if (existing) { seeded.push(`${r.name} (already exists)`); continue; }

      const role = await this.prisma.role.create({
        data: { name: r.name, description: r.description, companyId, domain: HR_DOMAIN },
      });
      await this.prisma.rolePermission.createMany({
        data: r.permissions.map(p => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      });
      seeded.push(r.name);
    }

    return { message: 'HR default roles seeded', seeded };
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  private async assertHrPermissionsOnly(permissionIds: string[]) {
    const perms = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      include: { module: { select: { slug: true } } },
    });
    const nonHr = perms.filter(p => !HR_MODULE_SLUGS.includes(p.module.slug));
    if (nonHr.length) {
      throw new ForbiddenException(
        `HR roles may only contain permissions from HR modules. Non-HR permissions rejected: ${nonHr.map(p => p.module.slug).join(', ')}`
      );
    }
  }

  private async assertHrRolesOnly(roleIds: string[], companyId: string) {
    const roles = await this.prisma.role.findMany({ where: { id: { in: roleIds }, companyId } });
    const nonHr = roles.filter(r => r.domain !== HR_DOMAIN);
    if (nonHr.length) {
      throw new ForbiddenException(
        `HR users may only be assigned HR-domain roles. Non-HR roles rejected: ${nonHr.map(r => r.name).join(', ')}`
      );
    }
  }
}
