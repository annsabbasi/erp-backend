import {
  Controller,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { TenantContextService } from '../../common/context/tenant-context.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PrivacyService } from './privacy.service';

@Controller('privacy/users')
export class PrivacyController {
  constructor(
    private readonly privacy: PrivacyService,
    private readonly tenant: TenantContextService,
  ) {}

  @RequirePermission('system.privacy.export')
  @Post(':id/export')
  exportSubject(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.privacy.exportSubject(id, this.tenantScope(), {
      actorId: user?.sub ?? null,
      ip: req.ip,
    });
  }

  @RequirePermission('system.privacy.erase')
  @Post(':id/erase')
  eraseSubject(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.privacy.eraseSubject(id, this.tenantScope(), {
      actorId: user?.sub ?? null,
      ip: req.ip,
    });
  }

  private tenantScope(): string | null {
    return this.tenant.isSuperAdmin ? null : this.tenant.requireCompanyId();
  }
}
