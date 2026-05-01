import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.department.findMany({
      where: { companyId },
      include: { _count: { select: { employees: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, companyId },
      include: { employees: true },
    });
    if (!dept) throw new NotFoundException(`Department ${id} not found`);
    return dept;
  }

  create(companyId: string, dto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: { companyId, name: dto.name, description: dto.description },
    });
  }

  async update(companyId: string, id: string, dto: UpdateDepartmentDto) {
    await this.findOne(companyId, id);
    return this.prisma.department.update({
      where: { id },
      data: { name: dto.name, description: dto.description },
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.department.delete({ where: { id } });
    return { message: `Department ${id} removed` };
  }
}
