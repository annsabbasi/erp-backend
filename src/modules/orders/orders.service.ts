import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto, OrderStatus } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  private orders: any[] = [];

  findAll() {
    return this.orders;
  }

  findOne(id: number) {
    const order = this.orders.find((o) => o.id === id);
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    return order;
  }

  create(dto: CreateOrderDto) {
    const total = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const order = {
      id: Date.now(),
      ...dto,
      total,
      status: OrderStatus.PENDING,
      createdAt: new Date().toISOString(),
    };
    this.orders.push(order);
    return order;
  }

  update(id: number, dto: UpdateOrderDto) {
    const index = this.orders.findIndex((o) => o.id === id);
    if (index === -1) throw new NotFoundException(`Order #${id} not found`);
    this.orders[index] = { ...this.orders[index], ...dto };
    return this.orders[index];
  }

  remove(id: number) {
    const index = this.orders.findIndex((o) => o.id === id);
    if (index === -1) throw new NotFoundException(`Order #${id} not found`);
    this.orders.splice(index, 1);
    return { message: `Order #${id} removed` };
  }
}
