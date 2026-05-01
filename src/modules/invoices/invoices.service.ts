import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.invoice.findMany({
      where: { companyId },
      include: { lines: true, order: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
      include: { lines: true, order: true },
    });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  create(companyId: string, dto: CreateInvoiceDto) {
    const lines = dto.lines ?? [];
    const total = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    return this.prisma.invoice.create({
      data: {
        companyId,
        orderId: dto.orderId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        total,
        lines: {
          create: lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            total: l.quantity * l.unitPrice,
          })),
        },
      },
      include: { lines: true, order: true },
    });
  }

  async update(companyId: string, id: string, dto: UpdateInvoiceDto) {
    await this.findOne(companyId, id);
    return this.prisma.invoice.update({
      where: { id },
      data: { status: dto.status },
      include: { lines: true, order: true },
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.invoice.delete({ where: { id } });
    return { message: `Invoice ${id} removed` };
  }
}
