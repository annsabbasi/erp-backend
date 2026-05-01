import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @RequirePermission('administration:VIEW')
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.rolesService.findAll(user.companyId);
  }

  @RequirePermission('administration:VIEW')
  @Get('permissions/available')
  getAvailablePermissions(@CurrentUser() user: any) {
    return this.rolesService.getAvailablePermissions(user.companyId);
  }

  @RequirePermission('administration:VIEW')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rolesService.findOne(id, user.companyId);
  }

  @RequirePermission('administration:CREATE')
  @Post()
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: any) {
    return this.rolesService.create(dto, user.companyId);
  }

  @RequirePermission('administration:UPDATE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateRoleDto>, @CurrentUser() user: any) {
    return this.rolesService.update(id, dto, user.companyId);
  }

  @RequirePermission('administration:DELETE')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rolesService.remove(id, user.companyId);
  }
}
