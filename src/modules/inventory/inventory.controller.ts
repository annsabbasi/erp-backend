import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { RequireModule } from '../../common/decorators/module-access.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard, ModuleAccessGuard)
@RequireModule('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @RequirePermission('inventory:VIEW')
  @Get()
  findAll() {
    return this.inventoryService.findAll();
  }

  @RequirePermission('inventory:VIEW')
  @Get('low-stock')
  findLowStock() {
    return this.inventoryService.findLowStock();
  }

  @RequirePermission('inventory:VIEW')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(+id);
  }

  @RequirePermission('inventory:CREATE')
  @Post()
  create(@Body() dto: CreateInventoryDto) {
    return this.inventoryService.create(dto);
  }

  @RequirePermission('inventory:UPDATE')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInventoryDto) {
    return this.inventoryService.update(+id, dto);
  }

  @RequirePermission('inventory:DELETE')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(+id);
  }
}
