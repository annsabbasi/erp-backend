import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @RequirePermission('hr.view')
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.employeesService.findAll(user.companyId);
  }

  @RequirePermission('hr.view')
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.employeesService.findOne(user.companyId, id);
  }

  @RequirePermission('hr.create')
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(user.companyId, dto);
  }

  @RequirePermission('hr.update')
  @Put(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(user.companyId, id, dto);
  }

  @RequirePermission('hr.delete')
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.employeesService.remove(user.companyId, id);
  }
}
