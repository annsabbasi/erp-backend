import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Read-only catalog of platform-defined permissions. Used by the role editor
 * UI to populate the "available permissions" tree.
 */
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.permission.findMany({
      orderBy: [{ moduleSlug: 'asc' }, { resource: 'asc' }, { action: 'asc' }],
    });
  }
}
