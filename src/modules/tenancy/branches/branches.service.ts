import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.branch.findMany({
      where: { companyId },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        _count: { select: { users: true, departments: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, companyId },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        departments: { select: { id: true, name: true } },
        _count: { select: { users: true, departments: true } },
      },
    });
    if (!branch) throw new NotFoundException(`Branch ${id} not found`);
    return branch;
  }

  async create(companyId: string, dto: CreateBranchDto) {
    const conflict = await this.prisma.branch.findFirst({
      where: { companyId, name: dto.name },
    });
    if (conflict) throw new BadRequestException('Branch name already exists in this company');

    if (dto.managerId) {
      await this.assertUserBelongsToCompany(dto.managerId, companyId);
    }

    return this.prisma.branch.create({
      data: {
        companyId,
        name: dto.name,
        code: dto.code,
        address: dto.address,
        managerId: dto.managerId,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateBranchDto) {
    await this.findOne(companyId, id);
    if (dto.name) {
      const conflict = await this.prisma.branch.findFirst({
        where: { companyId, name: dto.name, id: { not: id } },
      });
      if (conflict) throw new BadRequestException('Branch name already exists in this company');
    }
    if (dto.managerId) {
      await this.assertUserBelongsToCompany(dto.managerId, companyId);
    }
    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    const linked = await this.prisma.user.count({ where: { branchId: id } });
    if (linked) {
      throw new BadRequestException(
        `Cannot delete: ${linked} user(s) still belong to this branch`,
      );
    }
    await this.prisma.branch.delete({ where: { id } });
    return { message: `Branch ${id} deleted` };
  }

  private async assertUserBelongsToCompany(userId: string, companyId: string) {
    const u = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: { id: true },
    });
    if (!u) throw new BadRequestException('Branch manager must be a user in this company');
  }
}
