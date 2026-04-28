import { IsString, IsEnum } from 'class-validator';

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export class UpdateInvoiceDto {
  @IsEnum(InvoiceStatus)
  @IsString()
  status: InvoiceStatus;
}
