import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SystemModulesService } from './system-modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SuperAdminOnly } from '../../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('system-modules')
export class SystemModulesController {
  constructor(private readonly service: SystemModulesService) {}

  // Any authenticated user can read the module catalogue (needed for Company Admin UI).
  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  // Only super-admins may create, rename, or delete platform modules.
  @SuperAdminOnly()
  @Post()
  create(@Body() dto: CreateModuleDto) { return this.service.create(dto); }

  @SuperAdminOnly()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateModuleDto>) { return this.service.update(id, dto); }

  @SuperAdminOnly()
  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
