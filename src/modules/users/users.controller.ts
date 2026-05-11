import { Controller, Get, Post, Patch, Delete, Body, Param, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequirePermission('administration.view')
  @Get()
  findAll(@CurrentUser() user: any, @Query('companyId') qCompanyId?: string) {
    return this.usersService.findAll(resolveCompanyId(user, qCompanyId));
  }

  @RequirePermission('administration.view')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any, @Query('companyId') qCompanyId?: string) {
    return this.usersService.findOne(id, resolveCompanyId(user, qCompanyId));
  }

  @RequirePermission('administration.create')
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: any, @Query('companyId') qCompanyId?: string) {
    return this.usersService.create(dto, resolveCompanyId(user, qCompanyId));
  }

  @RequirePermission('administration.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: any, @Query('companyId') qCompanyId?: string) {
    return this.usersService.update(id, dto, resolveCompanyId(user, qCompanyId));
  }

  @RequirePermission('administration.delete')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any, @Query('companyId') qCompanyId?: string) {
    return this.usersService.remove(id, resolveCompanyId(user, qCompanyId));
  }
}
