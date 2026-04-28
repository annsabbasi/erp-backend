import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get('low-stock')
  findLowStock() {
    return this.inventoryService.findLowStock();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(+id);
  }

  @Post()
  create(@Body() dto: CreateInventoryDto) {
    return this.inventoryService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInventoryDto) {
    return this.inventoryService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(+id);
  }
}
