import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, BadRequestException, UseGuards,
} from '@nestjs/common';
import { HrService } from './hr.service';
import { CreateHrRoleDto } from './dto/create-hr-role.dto';
import { CreateHrUserDto, UpdateHrUserDto } from './dto/create-hr-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { RequireModule } from '../../common/decorators/module-access.decorator';

// Super admins supply ?companyId; company users use their JWT companyId.
function resolveCompanyId(user: any, qCompanyId?: string): string {
  if (user.isSuperAdmin) {
    if (!qCompanyId) throw new BadRequestException('Super admin must specify ?companyId');
    return qCompanyId;
  }
  return user.companyId;
}

@UseGuards(JwtAuthGuard, PermissionsGuard, ModuleAccessGuard)
@RequireModule('hr')
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  // ── HR Role Management ─────────────────────────────────────────────────────
  // hr:VIEW   → HR Viewer, HR Manager, HR Admin
  // hr:MANAGE → HR Admin only

  @RequirePermission('hr:VIEW')
  @Get('roles')
  findAllHrRoles(@CurrentUser() user: any, @Query('companyId') cid?: string) {
    return this.hrService.findAllHrRoles(resolveCompanyId(user, cid));
  }

  @RequirePermission('hr:VIEW')
  @Get('roles/permissions/available')
  getHrAvailablePermissions(@CurrentUser() user: any, @Query('companyId') cid?: string) {
    return this.hrService.getHrAvailablePermissions(resolveCompanyId(user, cid));
  }

  @RequirePermission('hr:VIEW')
  @Get('roles/:id')
  findOneHrRole(@Param('id') id: string, @CurrentUser() user: any, @Query('companyId') cid?: string) {
    return this.hrService.findOneHrRole(id, resolveCompanyId(user, cid));
  }

  @RequirePermission('hr:MANAGE')
  @Post('roles')
  createHrRole(@Body() dto: CreateHrRoleDto, @CurrentUser() user: any, @Query('companyId') cid?: string) {
    return this.hrService.createHrRole(dto, resolveCompanyId(user, cid));
  }

  @RequirePermission('hr:MANAGE')
  @Patch('roles/:id')
  updateHrRole(
    @Param('id') id: string,
    @Body() dto: Partial<CreateHrRoleDto>,
    @CurrentUser() user: any,
    @Query('companyId') cid?: string,
  ) {
    return this.hrService.updateHrRole(id, dto, resolveCompanyId(user, cid));
  }

  @RequirePermission('hr:MANAGE')
  @Delete('roles/:id')
  removeHrRole(@Param('id') id: string, @CurrentUser() user: any, @Query('companyId') cid?: string) {
    return this.hrService.removeHrRole(id, resolveCompanyId(user, cid));
  }

  // ── HR User Management ─────────────────────────────────────────────────────
  // hr:VIEW   → read HR users
  // hr:CREATE → HR Manager + Admin can add users
  // hr:UPDATE → HR Manager + Admin can edit users
  // hr:DELETE → HR Manager + Admin can deactivate users
  // hr:MANAGE → HR Admin can reassign roles

  @RequirePermission('hr:VIEW')
  @Get('users')
  findHrUsers(@CurrentUser() user: any, @Query('companyId') cid?: string) {
    return this.hrService.findHrUsers(resolveCompanyId(user, cid));
  }

  @RequirePermission('hr:VIEW')
  @Get('users/:id')
  findOneHrUser(@Param('id') id: string, @CurrentUser() user: any, @Query('companyId') cid?: string) {
    return this.hrService.findOneHrUser(id, resolveCompanyId(user, cid));
  }

  @RequirePermission('hr:CREATE')
  @Post('users')
  createHrUser(@Body() dto: CreateHrUserDto, @CurrentUser() user: any, @Query('companyId') cid?: string) {
    return this.hrService.createHrUser(dto, resolveCompanyId(user, cid));
  }

  @RequirePermission('hr:UPDATE')
  @Patch('users/:id')
  updateHrUser(
    @Param('id') id: string,
    @Body() dto: UpdateHrUserDto,
    @CurrentUser() user: any,
    @Query('companyId') cid?: string,
  ) {
    return this.hrService.updateHrUser(id, dto, resolveCompanyId(user, cid));
  }

  @RequirePermission('hr:DELETE')
  @Delete('users/:id')
  removeHrUser(@Param('id') id: string, @CurrentUser() user: any, @Query('companyId') cid?: string) {
    return this.hrService.removeHrUser(id, resolveCompanyId(user, cid));
  }

  // ── Seed Default Roles ─────────────────────────────────────────────────────
  // Only HR Admin (hr:MANAGE) or a company Sub-Admin can trigger this.

  @RequirePermission('hr:MANAGE')
  @Post('seed-defaults')
  seedDefaultHrRoles(@CurrentUser() user: any, @Query('companyId') cid?: string) {
    return this.hrService.seedDefaultHrRoles(resolveCompanyId(user, cid));
  }
}
