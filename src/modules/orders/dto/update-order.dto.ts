import { IsString, IsEnum } from 'class-validator';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export class UpdateOrderDto {
  @IsEnum(OrderStatus)
  @IsString()
  status: OrderStatus;
}
