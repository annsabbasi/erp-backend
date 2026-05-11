import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { TenantContextService } from '../../common/context/tenant-context.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { BillingInvoicesService } from './billing-invoices.service';
import {
  CreateBillingInvoiceDto,
  RecordPaymentDto,
} from './dto/billing.dto';

@Controller('companies/:companyId/billing/invoices')
export class BillingInvoicesController {
  constructor(
    private readonly invoices: BillingInvoicesService,
    private readonly tenant: TenantContextService,
  ) {}

  @RequirePermission('billing.invoice.view')
  @Get()
  list(@Param('companyId') companyId: string) {
    return this.invoices.list(this.scope(companyId));
  }

  @RequirePermission('billing.invoice.view')
  @Get(':id')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.invoices.findOne(this.scope(companyId), id);
  }

  @RequirePermission('billing.invoice.create')
  @Post()
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateBillingInvoiceDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.invoices.create(this.scope(companyId), dto, {
      actorId: user?.sub ?? null,
      ip: req.ip,
    });
  }

  @RequirePermission('billing.invoice.record_payment')
  @Post(':id/payments')
  recordPayment(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.invoices.recordPayment(this.scope(companyId), id, dto, {
      actorId: user?.sub ?? null,
      ip: req.ip,
    });
  }

  @RequirePermission('billing.invoice.create')
  @Post(':id/void')
  voidInvoice(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.invoices.voidInvoice(this.scope(companyId), id, {
      actorId: user?.sub ?? null,
      ip: req.ip,
    });
  }

  private scope(companyId: string): string {
    if (this.tenant.isSuperAdmin) return companyId;
    const own = this.tenant.requireCompanyId();
    if (own !== companyId) {
      throw new BadRequestException('Cannot access another company\'s billing data');
    }
    return own;
  }
}
