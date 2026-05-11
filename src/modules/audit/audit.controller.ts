import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { TenantContextService } from '../../common/context/tenant-context.service';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(
    private readonly audit: AuditService,
    private readonly tenant: TenantContextService,
  ) {}

  @RequirePermission('system.audit.view')
  @Get('events')
  list(
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('refType') refType?: string,
    @Query('refId') refId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('companyId') qCompanyId?: string,
  ) {
    return this.audit.list({
      companyId: this.scope(qCompanyId),
      actorId,
      action,
      refType,
      refId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @RequirePermission('system.audit.view')
  @Get('events/:id')
  async findOne(@Param('id') id: string) {
    const e = await this.audit.findOne(id);
    if (!e) throw new NotFoundException(`Audit event ${id} not found`);
    if (!this.tenant.isSuperAdmin && e.companyId !== this.tenant.requireCompanyId()) {
      throw new NotFoundException(`Audit event ${id} not found`);
    }
    return e;
  }

  @RequirePermission('system.audit.view')
  @Get('chain/verify')
  verifyChain(@Query('companyId') qCompanyId?: string) {
    return this.audit.verifyChain(this.scope(qCompanyId) ?? null);
  }

  @RequirePermission('system.audit.export')
  @Get('export')
  exportBundle(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('companyId') qCompanyId?: string,
  ) {
    return this.audit.exportBundle({
      companyId: this.scope(qCompanyId),
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  /**
   * Super admins MAY pass `?companyId=` to inspect a specific tenant; tenant
   * users are always pinned to their own company.
   */
  private scope(qCompanyId?: string): string | undefined {
    if (this.tenant.isSuperAdmin) return qCompanyId; // undefined => all
    const own = this.tenant.requireCompanyId();
    if (qCompanyId && qCompanyId !== own) {
      throw new BadRequestException("Cannot query another company's audit log");
    }
    return own;
  }
}
