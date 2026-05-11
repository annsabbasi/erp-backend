import { CONSTRUCTION_TEMPLATE } from './construction.template';
import { GENERIC_TEMPLATE } from './generic.template';
import { REAL_ESTATE_TEMPLATE } from './real-estate.template';
import type { IndustryTemplate } from './template.types';

export const TEMPLATES: Record<string, IndustryTemplate> = {
  generic: GENERIC_TEMPLATE,
  construction: CONSTRUCTION_TEMPLATE,
  real_estate: REAL_ESTATE_TEMPLATE,
};

export function getTemplate(key: string | null | undefined): IndustryTemplate {
  if (!key) return GENERIC_TEMPLATE;
  return TEMPLATES[key] ?? GENERIC_TEMPLATE;
}

export function listTemplates(): IndustryTemplate[] {
  return Object.values(TEMPLATES);
}
