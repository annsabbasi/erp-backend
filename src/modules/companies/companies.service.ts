import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto, AssignModulesDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, companyModules: true } } },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        companyModules: { include: { module: true } },
        _count: { select: { users: true } },
      },
    });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return company;
  }

  async create(dto: CreateCompanyDto) {
    const existing = await this.prisma.company.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('Company slug already taken');
    return this.prisma.company.create({ data: dto });
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.findOne(id);
    return this.prisma.company.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.company.delete({ where: { id } });
    return { message: `Company ${id} deleted` };
  }

  async assignModules(id: string, dto: AssignModulesDto) {
    await this.findOne(id);
    // Remove existing, then re-assign
    await this.prisma.companyModule.deleteMany({ where: { companyId: id } });
    await this.prisma.companyModule.createMany({
      data: dto.moduleIds.map(moduleId => ({ companyId: id, moduleId })),
      skipDuplicates: true,
    });
    return this.findOne(id);
  }

  async toggleModule(companyId: string, moduleId: string, isEnabled: boolean) {
    return this.prisma.companyModule.upsert({
      where: { companyId_moduleId: { companyId, moduleId } },
      create: { companyId, moduleId, isEnabled },
      update: { isEnabled },
    });
  }
}
