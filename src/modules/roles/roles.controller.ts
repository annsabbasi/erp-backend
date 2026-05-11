import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { TenantContextService } from '../../common/context/tenant-context.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import {
  CloneRoleDto,
  CreateRoleDto,
  UpdateRoleDto,
} from './dto/create-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(
    private readonly roles: RolesService,
    private readonly tenant: TenantContextService,
  ) {}

  @RequirePermission('administration.view')
  @Get()
  findAll(@Query('companyId') qCompanyId?: string) {
    return this.roles.findAll(this.resolveCompanyId(qCompanyId));
  }

  @RequirePermission('administration.view')
  @Get('permissions/available')
  available(@Query('companyId') qCompanyId?: string) {
    return this.roles.getAvailablePermissions(this.resolveCompanyId(qCompanyId));
  }

  @RequirePermission('administration.view')
  @Get('users/:userId/effective-permissions')
  effective(@Param('userId') userId: string, @Query('companyId') qCompanyId?: string) {
    return this.roles.effectivePermissionsForUser(userId, this.resolveCompanyId(qCompanyId));
  }

  @RequirePermission('administration.view')
  @Get(':id')
  findOne(@Param('id') id: string, @Query('companyId') qCompanyId?: string) {
    return this.roles.findOne(id, this.resolveCompanyId(qCompanyId));
  }

  @RequirePermission('system.role.manage')
  @Post()
  create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: any,
    @Req() req: Request,
    @Query('companyId') qCompanyId?: string,
  ) {
    return this.roles.create(dto, this.resolveCompanyId(qCompanyId), {
      actorId: user?.sub ?? null,
      ip: req.ip,
    });
  }

  @RequirePermission('system.role.manage')
  @Post(':id/clone')
  clone(
    @Param('id') id: string,
    @Body() dto: CloneRoleDto,
    @CurrentUser() user: any,
    @Req() req: Request,
    @Query('companyId') qCompanyId?: string,
  ) {
    return this.roles.clone(id, dto, this.resolveCompanyId(qCompanyId), {
      actorId: user?.sub ?? null,
      ip: req.ip,
    });
  }

  @RequirePermission('system.role.manage')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: any,
    @Req() req: Request,
    @Query('companyId') qCompanyId?: string,
  ) {
    return this.roles.update(id, dto, this.resolveCompanyId(qCompanyId), {
      actorId: user?.sub ?? null,
      ip: req.ip,
    });
  }

  @RequirePermission('system.role.manage')
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
    @Query('companyId') qCompanyId?: string,
  ) {
    return this.roles.remove(id, this.resolveCompanyId(qCompanyId), {
      actorId: user?.sub ?? null,
      ip: req.ip,
    });
  }

  /**
   * Super admins must explicitly target a company via ?companyId. Tenant
   * users always operate in their own company.
   */
  private resolveCompanyId(qCompanyId?: string): string {
    if (this.tenant.isSuperAdmin) {
      if (!qCompanyId) throw new BadRequestException('Super admin must specify ?companyId');
      return qCompanyId;
    }
    return this.tenant.requireCompanyId();
  }
}
