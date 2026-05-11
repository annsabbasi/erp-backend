import type { PermissionScope } from '@prisma/client';

/**
 * Declarative shape of an industry template (Section 8.1).
 *
 * Templates are versioned, code-reviewed bundles applied during company
 * onboarding. Everything declared here is the seed state — once applied, the
 * company can edit anything freely (the original template is just a recorded
 * starting point on Company.templateApplied).
 */
export interface IndustryTemplate {
  key: string;                 // "generic" | "construction" | "real_estate" | …
  name: string;
  description: string;
  version: number;             // bump when template content changes

  // Modules to enable on the new company. These must intersect the
  // subscription's plan modules — anything not on the plan is skipped.
  defaultModuleSlugs: string[];

  // Default roles seeded for the company. Each binds to either:
  //   • permissionSetKeys — system PermissionSets (recommended)
  //   • permissionKeys    — direct permission keys (one-offs)
  defaultRoles: Array<{
    name: string;
    description: string;
    domain?: string;
    isDefault?: boolean;
    defaultScope?: PermissionScope;
    permissionSetKeys?: string[];
    permissionKeys?: string[];
  }>;

  // Tenancy profile defaults (Company.* fields).
  profile?: {
    currency?: string;        // ISO-4217
    locale?: string;          // BCP-47
    timezone?: string;        // IANA
    fiscalYearStart?: number; // 1..12
  };

  // Branding & terminology overrides (Section 8.1).
  // Renders into Company.branding as JSON.
  terminology?: Record<string, string>;
}
