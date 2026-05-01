import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto, AssignModulesDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission, SuperAdminOnly } from '../../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  // Listing all companies is a platform-level operation.
  @SuperAdminOnly()
  @Get()
  findAll() {
    return this.companiesService.findAll();
  }

  // Company admins can view their own company's details (module list, etc.).
  @RequirePermission('administration:VIEW')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @SuperAdminOnly()
  @Post()
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @SuperAdminOnly()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  @SuperAdminOnly()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }

  @SuperAdminOnly()
  @Post(':id/modules')
  assignModules(@Param('id') id: string, @Body() dto: AssignModulesDto) {
    return this.companiesService.assignModules(id, dto);
  }

  // Company admins can toggle modules for their own company.
  @RequirePermission('administration:MANAGE')
  @Patch(':id/modules/:moduleId/toggle')
  toggleModule(
    @Param('id') companyId: string,
    @Param('moduleId') moduleId: string,
    @Body('isEnabled') isEnabled: boolean,
  ) {
    return this.companiesService.toggleModule(companyId, moduleId, isEnabled);
  }
}
