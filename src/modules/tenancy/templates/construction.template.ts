import { PermissionScope } from '@prisma/client';
import type { IndustryTemplate } from './template.types';

/**
 * Construction industry template (spec Section 5.4.1).
 *
 * Seed roles mirror the spec's reference list — Construction Manager, Project
 * Manager, Site Engineer, Safety Officer, Lab Attendant, Contractor — and
 * default terminology renames "Project" to "Site". The Construction Management
 * domain module itself ships in Phase D; until then these roles bind to the
 * generic core modules.
 */
export const CONSTRUCTION_TEMPLATE: IndustryTemplate = {
  key: 'construction',
  name: 'Construction',
  description: 'Construction firms managing projects, contractors, safety, and BOQ.',
  version: 1,
  defaultModuleSlugs: [
    'administration',
    'financials',
    'hr',
    'hr-employee-records',
    'hr-attendance',
    'inventory',
    'purchasing',
    'crm',
    'reports',
  ],
  defaultRoles: [
    {
      name: 'Construction Manager',
      description: 'End-to-end project delivery; allocates resources and budget.',
      defaultScope: PermissionScope.ALL,
      permissionSetKeys: ['administration.power', 'financials.viewer', 'hr.power', 'reports.manager'],
    },
    {
      name: 'Project Manager',
      description: 'Plans and tracks individual project progress.',
      defaultScope: PermissionScope.BRANCH,
      permissionSetKeys: ['hr.viewer', 'reports.viewer'],
    },
    {
      name: 'Site Engineer',
      description: 'Day-to-day site operations; coordinates labor and materials.',
      defaultScope: PermissionScope.OWN,
      permissionSetKeys: ['inventory.standard', 'hr-attendance.standard'],
    },
    {
      name: 'Safety Officer',
      description: 'Site inspections, incident logging, compliance reporting.',
      defaultScope: PermissionScope.BRANCH,
      permissionSetKeys: ['reports.viewer'],
    },
    {
      name: 'Lab Attendant',
      description: 'Records material test results and uploads lab reports.',
      defaultScope: PermissionScope.OWN,
      permissionSetKeys: [],
    },
    {
      name: 'Contractor',
      description: 'External or internal sub-contractor on assigned work packages.',
      defaultScope: PermissionScope.OWN,
      permissionSetKeys: [],
    },
  ],
  profile: {
    currency: 'USD',
    locale: 'en-US',
    timezone: 'UTC',
    fiscalYearStart: 1,
  },
  terminology: {
    Project: 'Site',
    Customer: 'Client',
    Order: 'Work Order',
  },
};
