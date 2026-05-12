import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { RequireModule } from '../../common/decorators/module-access.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard, ModuleAccessGuard)
@RequireModule('purchasing')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @RequirePermission('purchasing.view')
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.ordersService.findAll(user.companyId);
  }

  @RequirePermission('purchasing.view')
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.findOne(user.companyId, id);
  }

  @RequirePermission('purchasing.create')
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.companyId, dto);
  }

  @RequirePermission('purchasing.update')
  @Put(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(user.companyId, id, dto);
  }

  @RequirePermission('purchasing.delete')
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.remove(user.companyId, id);
  }
}
