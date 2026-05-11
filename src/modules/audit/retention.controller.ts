import {
  Body,
  Controller,
  Get,
  Post,
  Put,
} from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { RequirePermission, SuperAdminOnly } from '../../common/decorators/permissions.decorator';
import { RetentionService } from './retention.service';

class UpsertRetentionDto {
  @IsString()
  dataClass: string;

  @IsInt()
  @Min(1)
  retentionDays: number;

  @IsBoolean()
  @IsOptional()
  isEnforced?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}

@Controller('audit/retention')
export class RetentionController {
  constructor(private readonly retention: RetentionService) {}

  @RequirePermission('system.retention.manage')
  @Get('policies')
  list() {
    return this.retention.list();
  }

  @RequirePermission('system.retention.manage')
  @Put('policies')
  upsert(@Body() dto: UpsertRetentionDto) {
    return this.retention.upsert(dto.dataClass, dto.retentionDays, dto.isEnforced ?? true, dto.notes);
  }

  @SuperAdminOnly()
  @Post('enforce')
  enforce() {
    return this.retention.enforce();
  }
}
