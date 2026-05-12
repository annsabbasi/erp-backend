import { SetMetadata } from '@nestjs/common';

export const MODULE_ACCESS_KEY = 'requiredModule';

// Usage: @RequireModule('hr') at controller class or handler level.
// Enforced by ModuleAccessGuard against the user's enabledModuleSlugs.
export const RequireModule = (slug: string) => SetMetadata(MODULE_ACCESS_KEY, slug);
