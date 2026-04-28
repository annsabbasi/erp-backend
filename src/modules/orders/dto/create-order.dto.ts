import { IsNumber, IsArray, IsString, IsOptional, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateOrderDto {
  @IsNumber()
  customerId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
