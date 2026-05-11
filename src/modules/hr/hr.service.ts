import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PermissionScope } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHrRoleDto } from './dto/create-hr-role.dto';
import { CreateHrUserDto, UpdateHrUserDto } from './dto/create-hr-user.dto';

const HR_DOMAIN = 'HR';
const HR_MODULE_SLUGS = ['hr', 'hr-payroll', 'hr-employee-records', 'hr-attendance', 'hr-recruitment'];

/**
 * HR-domain wrapper around Roles + Users.
 *
 * Mirrors the platform-level RolesService but locks reads/writes to the HR
 * domain — i.e. roles whose `domain = "HR"` and the users assigned to them.
 * Permission references use the platform Permission catalog filtered to
 * HR-module slugs.
 */
@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  // ── HR Role Management ────────────────────────────────────────────────────

  findAllHrRoles(companyId: string) {
    return this.prisma.role.findMany({
      where: { companyId, domain: HR_DOMAIN },
      include: this.roleInclude(),
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOneHrRole(id: string, companyId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, companyId, domain: HR_DOMAIN },
      include: {
        ...this.roleInclude(),
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
        data: dto.permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
          scope: PermissionScope.ALL,
        })),
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
          data: permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
            scope: PermissionScope.ALL,
          })),
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
    const enabled = await this.prisma.companyModule.findMany({
      where: { companyId, isEnabled: true },
      include: { module: { select: { slug: true } } },
    });
    const enabledHrSlugs = enabled
      .map((cm) => cm.module.slug)
      .filter((slug) => HR_MODULE_SLUGS.includes(slug));

    return this.prisma.permission.findMany({
      where: { moduleSlug: { in: enabledHrSlugs } },
      orderBy: [{ moduleSlug: 'asc' }, { resource: 'asc' }, { action: 'asc' }],
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
      select: this.userSelect(),
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

  private fetchHrUserData(id: string, companyId: string) {
    return this.prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
      select: this.userSelect(),
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
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        companyId,
        departmentId: dto.departmentId,
        passwordChangedAt: new Date(),
      },
    });

    await this.prisma.userRole.createMany({
      data: dto.roleIds.map((roleId) => ({ userId: user.id, roleId })),
      skipDuplicates: true,
    });

    const hrModules = await this.prisma.systemModule.findMany({
      where: { slug: { in: HR_MODULE_SLUGS } },
    });
    await this.prisma.userModule.createMany({
      data: hrModules.map((mod) => ({ userId: user.id, moduleId: mod.id })),
      skipDuplicates: true,
    });

    return this.findOneHrUser(user.id, companyId);
  }

  async updateHrUser(id: string, dto: UpdateHrUserDto, companyId: string) {
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
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
      data.passwordChangedAt = new Date();
    }
    if (typeof dto.isActive === 'boolean') data.isActive = dto.isActive;
    if (dto.departmentId !== undefined) data.departmentId = dto.departmentId;

    await this.prisma.user.update({ where: { id }, data });

    if (dto.roleIds !== undefined) {
      const currentHr = await this.prisma.userRole.findMany({
        where: { userId: id, role: { domain: HR_DOMAIN } },
        select: { roleId: true },
      });
      if (currentHr.length) {
        await this.prisma.userRole.deleteMany({
          where: { userId: id, roleId: { in: currentHr.map((r) => r.roleId) } },
        });
      }
      await this.prisma.userRole.createMany({
        data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
        skipDuplicates: true,
      });
    }

    const updated = await this.fetchHrUserData(id, companyId);
    if (!updated) throw new NotFoundException(`HR user ${id} not found after update`);
    return updated;
  }

  async removeHrUser(id: string, companyId: string) {
    await this.findOneHrUser(id, companyId);
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: `HR user ${id} deactivated` };
  }

  // ── Seed Default HR Roles ─────────────────────────────────────────────────

  async seedDefaultHrRoles(companyId: string) {
    // Pull system permission sets defined in the catalog (e.g. "hr.viewer", "hr.standard").
    const sets = await this.prisma.permissionSet.findMany({
      where: {
        isSystem: true,
        key: { in: HR_MODULE_SLUGS.flatMap((s) => [`${s}.viewer`, `${s}.standard`, `${s}.power`, `${s}.manager`]) },
      },
    });
    const setByKey = new Map(sets.map((s) => [s.key!, s]));

    const definitions: { name: string; description: string; setKeys: string[]; defaultScope: PermissionScope }[] = [
      {
        name: 'HR Admin',
        description: 'Full control over all HR modules and configurations',
        setKeys: HR_MODULE_SLUGS.map((s) => `${s}.manager`),
        defaultScope: PermissionScope.ALL,
      },
      {
        name: 'HR Manager',
        description: 'Elevated HR access: department-scoped management',
        setKeys: HR_MODULE_SLUGS.map((s) => `${s}.power`),
        defaultScope: PermissionScope.DEPARTMENT,
      },
      {
        name: 'HR Viewer',
        description: 'Read-only access to authorized HR data',
        setKeys: HR_MODULE_SLUGS.map((s) => `${s}.viewer`),
        defaultScope: PermissionScope.DEPARTMENT,
      },
    ];

    const seeded: string[] = [];
    for (const def of definitions) {
      const existing = await this.prisma.role.findFirst({ where: { name: def.name, companyId } });
      if (existing) { seeded.push(`${def.name} (already exists)`); continue; }

      const role = await this.prisma.role.create({
        data: {
          name: def.name,
          description: def.description,
          companyId,
          domain: HR_DOMAIN,
          defaultScope: def.defaultScope,
        },
      });

      const setIds = def.setKeys.map((k) => setByKey.get(k)?.id).filter((v): v is string => !!v);
      if (setIds.length) {
        await this.prisma.rolePermissionSet.createMany({
          data: setIds.map((setId) => ({ roleId: role.id, setId })),
          skipDuplicates: true,
        });
      }
      seeded.push(def.name);
    }

    return { message: 'HR default roles seeded', seeded };
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  private async assertHrPermissionsOnly(permissionIds: string[]) {
    const perms = await this.prisma.permission.findMany({ where: { id: { in: permissionIds } } });
    const nonHr = perms.filter((p) => !HR_MODULE_SLUGS.includes(p.moduleSlug));
    if (nonHr.length) {
      throw new ForbiddenException(
        `HR roles may only contain permissions from HR modules. Non-HR permissions rejected: ${nonHr.map((p) => p.moduleSlug).join(', ')}`,
      );
    }
  }

  private async assertHrRolesOnly(roleIds: string[], companyId: string) {
    const roles = await this.prisma.role.findMany({ where: { id: { in: roleIds }, companyId } });
    const nonHr = roles.filter((r) => r.domain !== HR_DOMAIN);
    if (nonHr.length) {
      throw new ForbiddenException(
        `HR users may only be assigned HR-domain roles. Non-HR roles rejected: ${nonHr.map((r) => r.name).join(', ')}`,
      );
    }
  }

  private roleInclude() {
    return {
      _count: { select: { userRoles: true } },
      rolePermissions: { include: { permission: true } },
      rolePermissionSets: { include: { set: true } },
    } as const;
  }

  private userSelect() {
    return {
      id: true, name: true, email: true, isActive: true, createdAt: true,
      roleType: true, departmentId: true,
      department: { select: { id: true, name: true } },
      userRoles: {
        where: { role: { domain: HR_DOMAIN } },
        select: { role: { select: { id: true, name: true, domain: true } } },
      },
      userModules: { select: { module: { select: { id: true, name: true, slug: true } } } },
    } as const;
  }
}
