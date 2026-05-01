import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @RequirePermission('hr:VIEW')
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.departmentsService.findAll(user.companyId);
  }

  @RequirePermission('hr:VIEW')
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.departmentsService.findOne(user.companyId, id);
  }

  @RequirePermission('hr:CREATE')
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(user.companyId, dto);
  }

  @RequirePermission('hr:UPDATE')
  @Put(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(user.companyId, id, dto);
  }

  @RequirePermission('hr:DELETE')
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.departmentsService.remove(user.companyId, id);
  }
}
