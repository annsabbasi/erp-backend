import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { listTemplates } from './templates/registry';

@Controller('industry-templates')
export class TemplatesController {
  /** Public — used by the onboarding wizard to show available industries. */
  @Public()
  @Get()
  list() {
    return listTemplates().map((t) => ({
      key: t.key,
      name: t.name,
      description: t.description,
      version: t.version,
      defaultModuleSlugs: t.defaultModuleSlugs,
      defaultRoles: t.defaultRoles.map((r) => ({ name: r.name, description: r.description })),
      profile: t.profile,
      terminology: t.terminology ?? null,
    }));
  }
}
