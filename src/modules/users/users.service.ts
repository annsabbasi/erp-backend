import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, name: true, email: true, isActive: true, createdAt: true,
        userRoles: { select: { role: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
      select: { id: true, name: true, email: true, isActive: true, createdAt: true,
        userRoles: { select: { role: { select: { id: true, name: true } } } } },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto, companyId: string) {
    const existing = await this.prisma.user.findFirst({ where: { email: dto.email, companyId } });
    if (existing) throw new BadRequestException('Email already in use in this company');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash, companyId },
      select: { id: true, name: true, email: true, isActive: true, createdAt: true },
    });

    if (dto.roleIds?.length) {
      await this.prisma.userRole.createMany({
        data: dto.roleIds.map(roleId => ({ userId: user.id, roleId })),
        skipDuplicates: true,
      });
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto, companyId: string) {
    await this.findOne(id, companyId);
    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.email) data.email = dto.email;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);
    if (typeof dto.isActive === 'boolean') data.isActive = dto.isActive;

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, isActive: true, updatedAt: true },
    });

    if (dto.roleIds) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      if (dto.roleIds.length) {
        await this.prisma.userRole.createMany({
          data: dto.roleIds.map(roleId => ({ userId: id, roleId })),
          skipDuplicates: true,
        });
      }
    }

    return user;
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: `User ${id} deleted` };
  }
}
