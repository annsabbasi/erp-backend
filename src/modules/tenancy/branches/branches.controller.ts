import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { TenantContextService } from '../../../common/context/tenant-context.service';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Controller('branches')
export class BranchesController {
  constructor(
    private readonly branches: BranchesService,
    private readonly tenant: TenantContextService,
  ) {}

  @RequirePermission('tenancy.branch.view')
  @Get()
  list() {
    return this.branches.list(this.tenant.requireCompanyId());
  }

  @RequirePermission('tenancy.branch.view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branches.findOne(this.tenant.requireCompanyId(), id);
  }

  @RequirePermission('tenancy.branch.create')
  @Post()
  create(@Body() dto: CreateBranchDto) {
    return this.branches.create(this.tenant.requireCompanyId(), dto);
  }

  @RequirePermission('tenancy.branch.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branches.update(this.tenant.requireCompanyId(), id, dto);
  }

  @RequirePermission('tenancy.branch.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.branches.remove(this.tenant.requireCompanyId(), id);
  }
}
