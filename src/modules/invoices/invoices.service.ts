import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto, InvoiceStatus } from './dto/update-invoice.dto';

@Injectable()
export class InvoicesService {
  private invoices: any[] = [];
  private invoiceCounter = 1000;

  findAll() {
    return this.invoices;
  }

  findOne(id: number) {
    const invoice = this.invoices.find((i) => i.id === id);
    if (!invoice) throw new NotFoundException(`Invoice #${id} not found`);
    return invoice;
  }

  create(dto: CreateInvoiceDto) {
    const invoice = {
      id: Date.now(),
      invoiceNumber: `INV-${++this.invoiceCounter}`,
      ...dto,
      status: InvoiceStatus.DRAFT,
      issuedAt: new Date().toISOString(),
    };
    this.invoices.push(invoice);
    return invoice;
  }

  update(id: number, dto: UpdateInvoiceDto) {
    const index = this.invoices.findIndex((i) => i.id === id);
    if (index === -1) throw new NotFoundException(`Invoice #${id} not found`);
    this.invoices[index] = { ...this.invoices[index], ...dto };
    return this.invoices[index];
  }

  remove(id: number) {
    const index = this.invoices.findIndex((i) => i.id === id);
    if (index === -1) throw new NotFoundException(`Invoice #${id} not found`);
    this.invoices.splice(index, 1);
    return { message: `Invoice #${id} removed` };
  }
}
