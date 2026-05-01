import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @RequirePermission('financials:VIEW')
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.invoicesService.findAll(user.companyId);
  }

  @RequirePermission('financials:VIEW')
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.invoicesService.findOne(user.companyId, id);
  }

  @RequirePermission('financials:CREATE')
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(user.companyId, dto);
  }

  @RequirePermission('financials:UPDATE')
  @Put(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(user.companyId, id, dto);
  }

  @RequirePermission('financials:DELETE')
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.invoicesService.remove(user.companyId, id);
  }
}
