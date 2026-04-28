import { IsNumber, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateInvoiceDto {
  @IsNumber()
  orderId: number;

  @IsNumber()
  customerId: number;

  @IsDateString()
  dueDate: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
