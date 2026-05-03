import { Controller, Get, Post, Patch, Delete, Body, Param, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

// Super admins pass ?companyId=<id>; company users always use their JWT companyId.
function resolveCompanyId(user: any, qCompanyId?: string): string {
  if (user.isSuperAdmin) {
    if (!qCompanyId) throw new BadRequestException('Super admin must specify ?companyId');
    return qCompanyId;
  }
  return user.companyId;
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @RequirePermission('administration:VIEW')
  @Get()
  findAll(@CurrentUser() user: any, @Query('companyId') qCompanyId?: string) {
    return this.rolesService.findAll(resolveCompanyId(user, qCompanyId));
  }

  @RequirePermission('administration:VIEW')
  @Get('permissions/available')
  getAvailablePermissions(@CurrentUser() user: any, @Query('companyId') qCompanyId?: string) {
    return this.rolesService.getAvailablePermissions(resolveCompanyId(user, qCompanyId));
  }

  @RequirePermission('administration:VIEW')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any, @Query('companyId') qCompanyId?: string) {
    return this.rolesService.findOne(id, resolveCompanyId(user, qCompanyId));
  }

  @RequirePermission('administration:CREATE')
  @Post()
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: any, @Query('companyId') qCompanyId?: string) {
    return this.rolesService.create(dto, resolveCompanyId(user, qCompanyId));
  }

  @RequirePermission('administration:UPDATE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateRoleDto>, @CurrentUser() user: any, @Query('companyId') qCompanyId?: string) {
    return this.rolesService.update(id, dto, resolveCompanyId(user, qCompanyId));
  }

  @RequirePermission('administration:DELETE')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any, @Query('companyId') qCompanyId?: string) {
    return this.rolesService.remove(id, resolveCompanyId(user, qCompanyId));
  }
}
