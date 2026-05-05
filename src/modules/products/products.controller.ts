import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { RequireModule } from '../../common/decorators/module-access.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard, ModuleAccessGuard)
@RequireModule('inventory')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @RequirePermission('inventory:VIEW')
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.productsService.findAll(user.companyId);
  }

  @RequirePermission('inventory:VIEW')
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.findOne(user.companyId, id);
  }

  @RequirePermission('inventory:CREATE')
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.companyId, dto);
  }

  @RequirePermission('inventory:UPDATE')
  @Put(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(user.companyId, id, dto);
  }

  @RequirePermission('inventory:DELETE')
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.remove(user.companyId, id);
  }
}
