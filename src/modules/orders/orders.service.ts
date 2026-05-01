import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.order.findMany({
      where: { companyId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, companyId },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  create(companyId: string, dto: CreateOrderDto) {
    const total = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    return this.prisma.order.create({
      data: {
        companyId,
        total,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });
  }

  async update(companyId: string, id: string, dto: UpdateOrderDto) {
    await this.findOne(companyId, id);
    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: { items: { include: { product: true } } },
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.order.delete({ where: { id } });
    return { message: `Order ${id} removed` };
  }
}
