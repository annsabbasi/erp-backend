import { Module } from '@nestjs/common';
import { BranchesController } from './branches/branches.controller';
import { BranchesService } from './branches/branches.service';
import { TemplateApplierService } from './template-applier.service';
import { TemplatesController } from './templates.controller';

@Module({
  controllers: [BranchesController, TemplatesController],
  providers: [BranchesService, TemplateApplierService],
  exports: [BranchesService, TemplateApplierService],
})
export class TenancyModule {}
