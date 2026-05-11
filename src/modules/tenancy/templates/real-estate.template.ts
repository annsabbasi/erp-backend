import { PermissionScope } from '@prisma/client';
import type { IndustryTemplate } from './template.types';

/**
 * Housing-society / real-estate template (spec Section 5.4.2).
 * Renames "Customer" to "Resident" and "Order" to "Service Request".
 */
export const REAL_ESTATE_TEMPLATE: IndustryTemplate = {
  key: 'real_estate',
  name: 'Real Estate / Housing Society',
  description: 'Housing societies and real-estate developers managing properties, leases, and tenants.',
  version: 1,
  defaultModuleSlugs: [
    'administration',
    'financials',
    'hr',
    'hr-employee-records',
    'crm',
    'reports',
  ],
  defaultRoles: [
    {
      name: 'Property Manager',
      description: 'Manages leasing, sales, and maintenance for assigned properties.',
      defaultScope: PermissionScope.BRANCH,
      permissionSetKeys: ['crm.power', 'reports.viewer'],
    },
    {
      name: 'Sales Executive',
      description: 'Sells and leases units; manages prospects and contracts.',
      defaultScope: PermissionScope.OWN,
      permissionSetKeys: ['crm.standard'],
    },
    {
      name: 'Business Developer',
      description: 'Builds partnerships, brings investors, develops new pipelines.',
      defaultScope: PermissionScope.ALL,
      permissionSetKeys: ['crm.power', 'reports.viewer'],
    },
    {
      name: 'Maintenance Supervisor',
      description: 'Schedules and oversees repairs; manages technicians.',
      defaultScope: PermissionScope.BRANCH,
      permissionSetKeys: ['inventory.viewer'],
    },
    {
      name: 'Community Manager',
      description: 'Manages tenant communications, events, complaints.',
      defaultScope: PermissionScope.BRANCH,
      permissionSetKeys: ['crm.standard'],
    },
    {
      name: 'Legal Advisor',
      description: 'Manages contracts, disputes, and compliance.',
      defaultScope: PermissionScope.ALL,
      permissionSetKeys: ['administration.viewer'],
    },
  ],
  profile: {
    currency: 'USD',
    locale: 'en-US',
    timezone: 'UTC',
    fiscalYearStart: 1,
  },
  terminology: {
    Customer: 'Resident',
    Order: 'Service Request',
    Project: 'Property',
  },
};
