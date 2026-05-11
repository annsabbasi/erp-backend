import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { SuperAdminOnly } from '../../common/decorators/permissions.decorator';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { PlansService } from './plans.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  /** Public plans listing — used by the marketing/signup page. */
  @Public()
  @Get()
  list(@Query('all') all?: string) {
    return this.plans.list({ publicOnly: all !== 'true' });
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.plans.findOne(id);
  }

  @SuperAdminOnly()
  @Post()
  create(@Body() dto: CreatePlanDto) {
    return this.plans.create(dto);
  }

  @SuperAdminOnly()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plans.update(id, dto);
  }

  @SuperAdminOnly()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.plans.remove(id);
  }
}
