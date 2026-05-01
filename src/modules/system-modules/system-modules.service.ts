import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModuleDto } from './dto/create-module.dto';

@Injectable()
export class SystemModulesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.systemModule.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { companyModules: true } } },
    });
  }

  async findOne(id: string) {
    const mod = await this.prisma.systemModule.findUnique({
      where: { id },
      include: { permissions: true },
    });
    if (!mod) throw new NotFoundException(`Module ${id} not found`);
    return mod;
  }

  async create(dto: CreateModuleDto) {
    const existing = await this.prisma.systemModule.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('Module slug already exists');

    const mod = await this.prisma.systemModule.create({ data: dto });

    // Auto-create all permission actions for this module
    const { PermissionAction } = await import('@prisma/client');
    await this.prisma.permission.createMany({
      data: Object.values(PermissionAction).map(action => ({ moduleId: mod.id, action })),
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
