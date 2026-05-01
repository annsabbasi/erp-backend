import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.employee.findMany({
      where: { companyId },
      include: { department: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, companyId },
      include: { department: true },
    });
    if (!employee) throw new NotFoundException(`Employee ${id} not found`);
    return employee;
  }

  create(companyId: string, dto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: {
        companyId,
        name: dto.name,
        email: dto.email,
        departmentId: dto.departmentId,
        position: dto.position,
        salary: dto.salary,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
      },
      include: { department: true },
    });
  }

  async update(companyId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findOne(companyId, id);
    return this.prisma.employee.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        departmentId: dto.departmentId,
        position: dto.position,
        salary: dto.salary,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
      },
      include: { department: true },
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.employee.delete({ where: { id } });
    return { message: `Employee ${id} removed` };
  }
}
