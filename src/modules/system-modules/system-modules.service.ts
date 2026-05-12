import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModuleDto } from './dto/create-module.dto';

const STD_ACTIONS = ['view', 'create', 'update', 'delete', 'manage'] as const;

@Injectable()
export class SystemModulesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.systemModule.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { companyModules: true } } },
    });
  }

  async findEnabledForCompany(companyId: string) {
    const rows = await this.prisma.companyModule.findMany({
      where: { companyId, isEnabled: true, module: { isActive: true } },
      include: { module: true },
      orderBy: { module: { name: 'asc' } },
    });
    return rows.map(r => r.module);
  }

  async findOne(id: string) {
    const mod = await this.prisma.systemModule.findUnique({ where: { id } });
    if (!mod) throw new NotFoundException(`Module ${id} not found`);
    const permissions = await this.prisma.permission.findMany({
      where: { moduleSlug: mod.slug },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
    return { ...mod, permissions };
  }

  async create(dto: CreateModuleDto) {
    const existing = await this.prisma.systemModule.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('Module slug already exists');

    const mod = await this.prisma.systemModule.create({ data: dto });

    // Auto-seed the standard CRUD permission keys for this module so existing
    // routes have something to gate on. Fine-grained permissions are added
    // later via the PERMISSION_CATALOG seed file.
    await this.prisma.permission.createMany({
      data: STD_ACTIONS.map((action) => ({
        key: `${mod.slug}.${action}`,
        resource: mod.slug,
        action,
        moduleSlug: mod.slug,
        description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${mod.name}`,
      })),
      skipDuplicates: true,
    });

    return mod;
  }

  async update(id: string, dto: Partial<CreateModuleDto>) {
    await this.findOne(id);
    return this.prisma.systemModule.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.systemModule.delete({ where: { id } });
    return { message: `Module ${id} deleted` };
  }
}
