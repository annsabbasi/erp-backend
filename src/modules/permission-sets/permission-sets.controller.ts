import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { TenantContextService } from '../../common/context/tenant-context.service';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import {
  CreatePermissionSetDto,
  ReplaceItemsDto,
  UpdatePermissionSetDto,
} from './dto/permission-set.dto';
import { PermissionSetsService } from './permission-sets.service';

@Controller('permission-sets')
export class PermissionSetsController {
  constructor(
    private readonly service: PermissionSetsService,
    private readonly tenant: TenantContextService,
  ) {}

  @RequirePermission('administration.view')
  @Get()
  list() {
    return this.service.list(this.tenant.requireCompanyId());
  }

  @RequirePermission('administration.view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id, this.tenant.requireCompanyId());
  }

  @RequirePermission('system.permission_set.manage')
  @Post()
  create(@Body() dto: CreatePermissionSetDto) {
    return this.service.create(dto, this.tenant.requireCompanyId());
  }

  @RequirePermission('system.permission_set.manage')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePermissionSetDto) {
    return this.service.update(id, dto, this.tenant.requireCompanyId());
  }

  @RequirePermission('system.permission_set.manage')
  @Put(':id/items')
  replaceItems(@Param('id') id: string, @Body() dto: ReplaceItemsDto) {
    return this.service.replaceItems(id, dto, this.tenant.requireCompanyId());
  }

  @RequirePermission('system.permission_set.manage')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id, this.tenant.requireCompanyId());
  }
}
