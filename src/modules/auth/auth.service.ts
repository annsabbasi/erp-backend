import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRoleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  companyId: string | null;
  isSuperAdmin: boolean;
  roleType: UserRoleType;
  departmentId: string | null;
  permissions: string[];  // "moduleSlug:action" e.g. "hr:VIEW"
  enabledModuleSlugs: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    let user: any;

    if (dto.companySlug) {
      // Company user — look up by company slug + email
      const company = await this.prisma.company.findUnique({
        where: { slug: dto.companySlug, isActive: true },
      });
      if (!company) throw new UnauthorizedException('Company not found or inactive');

      user = await this.prisma.user.findFirst({
        where: { email: dto.email, companyId: company.id, isActive: true, deletedAt: null },
        include: {
          ...this.userRolesInclude(),
          userModules: { include: { module: true } }
        },
      });
    } else {
      // Platform super admin — no company required
      user = await this.prisma.user.findFirst({
        where: { email: dto.email, isSuperAdmin: true, isActive: true, deletedAt: null },
      });
    }

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const permissions = user.isSuperAdmin ? ['*:*'] : this.extractPermissions(user.userRoles ?? []);
    const enabledModuleSlugs = await this.getUserModuleSlugs(user);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      companyId: user.companyId ?? null,
      isSuperAdmin: user.isSuperAdmin,
      roleType: user.roleType,
      departmentId: user.departmentId ?? null,
      permissions,
      enabledModuleSlugs,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        companyId: user.companyId ?? null,
        isSuperAdmin: user.isSuperAdmin,
        roleType: user.roleType,
        departmentId: user.departmentId ?? null,
        permissions,
        enabledModuleSlugs,
      },
    };
  }

  async register(dto: RegisterDto) {
    let companyId: string | null = null;

    if (dto.companySlug) {
      const company = await this.prisma.company.findUnique({ where: { slug: dto.companySlug } });
      if (!company) throw new BadRequestException('Company not found');
      companyId = company.id;
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, companyId: companyId ?? undefined },
    });
    if (existing) throw new BadRequestException('A user with this email already exists in this company');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash, companyId },
    });

    return {
      message: 'User registered successfully',
      user: { id: user.id, name: user.name, email: user.email, companyId: user.companyId },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        ...this.userRolesInclude(),
        userModules: { include: { module: true } }
      },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const permissions = user.isSuperAdmin ? ['*:*'] : this.extractPermissions(user.userRoles);
    const enabledModuleSlugs = await this.getUserModuleSlugs(user);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      companyId: user.companyId,
      isSuperAdmin: user.isSuperAdmin,
      roleType: user.roleType,
      departmentId: user.departmentId,
      permissions,
      enabledModuleSlugs,
      roles: (user.userRoles ?? []).map((ur: any) => ({ id: ur.role.id, name: ur.role.name })),
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  private async getUserModuleSlugs(user: any): Promise<string[]> {
    if (user.isSuperAdmin) {
      const modules = await this.prisma.systemModule.findMany({ where: { isActive: true } });
      return modules.map(m => m.slug);
    }

    if (!user.companyId) return [];

    // If Sub-Admin or Super-Admin role within company, they see all company enabled modules
    if (user.roleType === UserRoleType.SUB_ADMIN || user.roleType === UserRoleType.SUPER_ADMIN) {
      const rows = await this.prisma.companyModule.findMany({
        where: { companyId: user.companyId, isEnabled: true },
        include: { module: { select: { slug: true } } },
      });
      return rows.map((r) => r.module.slug);
    }

    // Managers and Normal Users:
    //   Module access = (modules assigned via UserModule)
    //                 ∪ (modules referenced by permissions in any of the user's roles)
    //   intersected with the company's enabled modules.
    // Roles imply module access — assigning a role like "HR Manager" automatically
    // makes the HR module visible without requiring a redundant module checkbox.
    const companyEnabled = await this.prisma.companyModule.findMany({
      where: { companyId: user.companyId, isEnabled: true },
      include: { module: { select: { slug: true } } },
    });
    const companyEnabledSlugs = new Set(companyEnabled.map(cm => cm.module.slug));

    const slugs = new Set<string>();
    for (const um of user.userModules ?? []) {
      if (um.module?.slug) slugs.add(um.module.slug);
    }
    for (const ur of user.userRoles ?? []) {
      for (const rp of ur.role?.rolePermissions ?? []) {
        const slug = rp.permission?.module?.slug;
        if (slug) slugs.add(slug);
      }
    }

    return [...slugs].filter(s => companyEnabledSlugs.has(s));
  }

  private userRolesInclude() {
    return {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: { include: { module: true } } },
              },
            },
          },
        },
      },
    };
  }

  private extractPermissions(userRoles: any[]): string[] {
    const perms = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        perms.add(`${rp.permission.module.slug}:${rp.permission.action}`);
      }
    }
    return [...perms];
  }
}
