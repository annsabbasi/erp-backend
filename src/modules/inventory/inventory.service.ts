import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Injectable()
export class InventoryService {
  private items: any[] = [];

  findAll() {
    return this.items;
  }

  findOne(id: number) {
    const item = this.items.find((i) => i.id === id);
    if (!item) throw new NotFoundException(`Inventory item #${id} not found`);
    return item;
  }

  findLowStock() {
    return this.items.filter((i) => i.quantity <= i.reorderLevel);
  }

  create(dto: CreateInventoryDto) {
    const item = { id: Date.now(), ...dto };
    this.items.push(item);
    return item;
  }

  update(id: number, dto: UpdateInventoryDto) {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) throw new NotFoundException(`Inventory item #${id} not found`);
    this.items[index] = { ...this.items[index], ...dto };
    return this.items[index];
  }

  remove(id: number) {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) throw new NotFoundException(`Inventory item #${id} not found`);
    this.items.splice(index, 1);
    return { message: `Inventory item #${id} removed` };
  }
}
