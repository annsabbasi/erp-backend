import { IsEnum } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export { OrderStatus };

export class UpdateOrderDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
