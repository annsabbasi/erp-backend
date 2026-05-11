import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { SubscriptionStatus } from '@prisma/client';
import { TenantContextService } from '../../common/context/tenant-context.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import {
  ChangePlanDto,
  CreateSubscriptionDto,
  TransitionDto,
} from './dto/subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('companies/:companyId/subscription')
export class SubscriptionsController {
  constructor(
    private readonly subs: SubscriptionsService,
    private readonly tenant: TenantContextService,
  ) {}

  @RequirePermission('billing.subscription.view')
  @Get()
  get(@Param('companyId') companyId: string) {
    return this.subs.findByCompany(this.scope(companyId));
  }

  @RequirePermission('billing.subscription.manage')
  @Post()
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.subs.create(this.scope(companyId), dto, { actorId: user?.sub ?? null, ip: req.ip });
  }

  @RequirePermission('billing.subscription.manage')
  @Patch('plan')
  changePlan(
    @Param('companyId') companyId: string,
    @Body() dto: ChangePlanDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.subs.changePlan(this.scope(companyId), dto, { actorId: user?.sub ?? null, ip: req.ip });
  }

  @RequirePermission('billing.subscription.manage')
  @Post('transitions/:status')
  transition(
    @Param('companyId') companyId: string,
    @Param('status') status: string,
    @Body() dto: TransitionDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const target = status.toUpperCase() as SubscriptionStatus;
    if (!Object.values(SubscriptionStatus).includes(target)) {
      throw new BadRequestException(`Unknown subscription status: ${status}`);
    }
    return this.subs.transition(this.scope(companyId), target, dto, {
      actorId: user?.sub ?? null,
      ip: req.ip,
    });
  }

  /**
   * Tenant users can only operate on their own company; super admins must
   * pass a matching :companyId in the URL.
   */
  private scope(companyId: string): string {
    if (this.tenant.isSuperAdmin) return companyId;
    const own = this.tenant.requireCompanyId();
    if (own !== companyId) {
      throw new BadRequestException('Cannot access another company\'s subscription');
    }
    return own;
  }
}
