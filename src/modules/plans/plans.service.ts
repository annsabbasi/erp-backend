import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  list(opts?: { publicOnly?: boolean }) {
    return this.prisma.plan.findMany({
      where: {
        isActive: true,
        ...(opts?.publicOnly ? { isPublic: true } : {}),
      },
      include: { modules: { include: { module: true } } },
      orderBy: [{ sortOrder: 'asc' }, { monthlyPrice: 'asc' }],
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: { modules: { include: { module: true } } },
    });
    if (!plan) throw new NotFoundException(`Plan ${id} not found`);
    return plan;
  }

  async findByKey(key: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { key },
      include: { modules: { include: { module: true } } },
    });
    if (!plan) throw new NotFoundException(`Plan with key ${key} not found`);
    return plan;
  }

  async create(dto: CreatePlanDto) {
    const existing = await this.prisma.plan.findUnique({ where: { key: dto.key } });
    if (existing) throw new BadRequestException('Plan key already exists');

    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.plan.create({
        data: {
          key: dto.key,
          name: dto.name,
          description: dto.description,
          isPublic: dto.isPublic ?? true,
          monthlyPrice: dto.monthlyPrice,
          annualPrice: dto.annualPrice,
          currency: dto.currency ?? 'USD',
          maxUsers: dto.maxUsers,
          trialDays: dto.trialDays ?? 14,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      if (dto.moduleSlugs?.length) {
        await this.setPlanModules(tx, plan.id, dto.moduleSlugs);
      }
      return tx.plan.findUnique({
        where: { id: plan.id },
        include: { modules: { include: { module: true } } },
      });
    });
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.plan.update({
        where: { id },
        data: {
          name: dto.name ?? undefined,
          description: dto.description ?? undefined,
          isPublic: dto.isPublic ?? undefined,
          isActive: dto.isActive ?? undefined,
          monthlyPrice: dto.monthlyPrice ?? undefined,
          annualPrice: dto.annualPrice ?? undefined,
          currency: dto.currency ?? undefined,
          maxUsers: dto.maxUsers ?? undefined,
          trialDays: dto.trialDays ?? undefined,
          sortOrder: dto.sortOrder ?? undefined,
        },
      });
      if (dto.moduleSlugs !== undefined) {
        await tx.planModule.deleteMany({ where: { planId: id } });
        if (dto.moduleSlugs.length) {
          await this.setPlanModules(tx, id, dto.moduleSlugs);
        }
      }
      return tx.plan.findUnique({
        where: { id },
        include: { modules: { include: { module: true } } },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const used = await this.prisma.subscription.count({ where: { planId: id } });
    if (used) {
      // Don't allow deleting a plan with active subscribers — soft-disable instead.
      await this.prisma.plan.update({ where: { id }, data: { isActive: false, isPublic: false } });
      return { message: `Plan ${id} disabled (still attached to ${used} subscription(s))` };
    }
    await this.prisma.plan.delete({ where: { id } });
    return { message: `Plan ${id} deleted` };
  }

  private async setPlanModules(
    tx: Prisma.TransactionClient,
    planId: string,
    moduleSlugs: string[],
  ) {
    const modules = await tx.systemModule.findMany({
      where: { slug: { in: moduleSlugs } },
    });
    const found = new Set(modules.map((m) => m.slug));
    const missing = moduleSlugs.filter((s) => !found.has(s));
    if (missing.length) {
      throw new BadRequestException(`Unknown module slugs: ${missing.join(', ')}`);
    }
    await tx.planModule.createMany({
      data: modules.map((m) => ({ planId, moduleId: m.id })),
      skipDuplicates: true,
    });
  }
}
