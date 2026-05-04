import { PrismaClient, PermissionAction } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SYSTEM_MODULES = [
  { name: 'Administration',       slug: 'administration',       description: 'User & system management',                  icon: 'Settings' },
  { name: 'Financials',           slug: 'financials',           description: 'Accounting & financial reports',             icon: 'DollarSign' },
  { name: 'HR',                   slug: 'hr',                   description: 'Human Resources core',                      icon: 'Users' },
  { name: 'HR Payroll',           slug: 'hr-payroll',           description: 'Payroll management',                        icon: 'CreditCard' },
  { name: 'HR Employee Records',  slug: 'hr-employee-records',  description: 'Employee master data & records',            icon: 'UserCheck' },
  { name: 'HR Attendance',        slug: 'hr-attendance',        description: 'Attendance & time tracking',                icon: 'Clock' },
  { name: 'HR Recruitment',       slug: 'hr-recruitment',       description: 'Hiring & recruitment workflows',            icon: 'UserPlus' },
  { name: 'CRM',                  slug: 'crm',                  description: 'Customer Relationship Management',          icon: 'Briefcase' },
  { name: 'Purchasing',           slug: 'purchasing',           description: 'Procurement & purchasing',                  icon: 'ShoppingCart' },
  { name: 'Inventory',            slug: 'inventory',            description: 'Stock & warehouse management',              icon: 'Package' },
  { name: 'Banking',              slug: 'banking',              description: 'Banking & payments',                        icon: 'Landmark' },
  { name: 'Reports',              slug: 'reports',              description: 'Business intelligence & reports',           icon: 'BarChart' },
];

// All slugs that belong to the HR domain
const HR_MODULE_SLUGS = ['hr', 'hr-payroll', 'hr-employee-records', 'hr-attendance', 'hr-recruitment'];

async function main() {
  console.log('🌱 Seeding database...');

  // ── System Modules ─────────────────────────────────────────────────────────
  for (const mod of SYSTEM_MODULES) {
    await prisma.systemModule.upsert({
      where: { slug: mod.slug },
      update: {},
      create: mod,
    });
  }
  console.log(`✅ ${SYSTEM_MODULES.length} system modules seeded`);

  // ── Permissions for each module (all actions) ──────────────────────────────
  const modules = await prisma.systemModule.findMany();
  for (const mod of modules) {
    for (const action of Object.values(PermissionAction)) {
      await prisma.permission.upsert({
        where: { moduleId_action: { moduleId: mod.id, action } },
        update: {},
        create: { moduleId: mod.id, action },
      });
    }
  }
  console.log('✅ Permissions seeded');

  // ── Super Admin (no company) ───────────────────────────────────────────────
  const superAdminHash = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email_companyId: { email: 'admin@erp.com', companyId: '' } },
    update: {},
    create: {
      email: 'admin@erp.com',
      name: 'Super Admin',
      passwordHash: superAdminHash,
      companyId: null,
      isSuperAdmin: true,
    },
  });
  console.log('✅ Super admin seeded  →  admin@erp.com / admin123');

  // ── Demo Company ───────────────────────────────────────────────────────────
  const demoCompany = await prisma.company.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'ERP Demo Company',
      slug: 'demo',
    },
  });
  console.log(`✅ Demo company seeded  →  slug: "demo"`);

  // Enable all modules for demo company
  for (const mod of modules) {
    await prisma.companyModule.upsert({
      where: { companyId_moduleId: { companyId: demoCompany.id, moduleId: mod.id } },
      update: {},
      create: { companyId: demoCompany.id, moduleId: mod.id, isEnabled: true },
    });
  }

  // ── Admin Role (full access) ───────────────────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { name_companyId: { name: 'Admin', companyId: demoCompany.id } },
    update: {},
    create: { name: 'Admin', description: 'Full access to all modules', companyId: demoCompany.id },
  });

  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // ── Viewer Role (view only) ────────────────────────────────────────────────
  const viewerRole = await prisma.role.upsert({
    where: { name_companyId: { name: 'Viewer', companyId: demoCompany.id } },
    update: {},
    create: {
      name: 'Viewer',
      description: 'Read-only access to Financials and CRM',
      companyId: demoCompany.id,
      isDefault: true,
    },
  });

  const viewPerms = await prisma.permission.findMany({
    where: { action: PermissionAction.VIEW, module: { slug: { in: ['financials', 'crm'] } } },
  });
  for (const perm of viewPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: viewerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: viewerRole.id, permissionId: perm.id },
    });
  }

  // ── HR Domain Roles ────────────────────────────────────────────────────────
  // HR Admin — full MANAGE over all HR sub-modules
  const hrAdminRole = await prisma.role.upsert({
    where: { name_companyId: { name: 'HR Admin', companyId: demoCompany.id } },
    update: { domain: 'HR' },
    create: {
      name: 'HR Admin',
      description: 'Full control over all HR modules and configurations',
      companyId: demoCompany.id,
      domain: 'HR',
    },
  });

  const hrAllPerms = await prisma.permission.findMany({
    where: { module: { slug: { in: HR_MODULE_SLUGS } } },
  });
  for (const perm of hrAllPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: hrAdminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: hrAdminRole.id, permissionId: perm.id },
    });
  }

  // HR Manager — CREATE/UPDATE/DELETE/VIEW on all HR sub-modules (no MANAGE)
  const hrManagerRole = await prisma.role.upsert({
    where: { name_companyId: { name: 'HR Manager', companyId: demoCompany.id } },
    update: { domain: 'HR' },
    create: {
      name: 'HR Manager',
      description: 'Elevated HR access: manage HR users and assign HR roles',
      companyId: demoCompany.id,
      domain: 'HR',
    },
  });

  const hrManagerPerms = await prisma.permission.findMany({
    where: {
      module: { slug: { in: HR_MODULE_SLUGS } },
      action: { in: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.UPDATE, PermissionAction.DELETE] },
    },
  });
  for (const perm of hrManagerPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: hrManagerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: hrManagerRole.id, permissionId: perm.id },
    });
  }

  // HR Viewer — VIEW only on all HR sub-modules
  const hrViewerRole = await prisma.role.upsert({
    where: { name_companyId: { name: 'HR Viewer', companyId: demoCompany.id } },
    update: { domain: 'HR' },
    create: {
      name: 'HR Viewer',
      description: 'Read-only access to authorized HR data',
      companyId: demoCompany.id,
      domain: 'HR',
    },
  });

  const hrViewPerms = await prisma.permission.findMany({
    where: {
      module: { slug: { in: HR_MODULE_SLUGS } },
      action: PermissionAction.VIEW,
    },
  });
  for (const perm of hrViewPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: hrViewerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: hrViewerRole.id, permissionId: perm.id },
    });
  }

  console.log('✅ HR domain roles seeded  →  HR Admin / HR Manager / HR Viewer');

  // ── Company Admin User ─────────────────────────────────────────────────────
  const companyAdminHash = await bcrypt.hash('password123', 12);
  const companyAdmin = await prisma.user.upsert({
    where: { email_companyId: { email: 'manager@demo.com', companyId: demoCompany.id } },
    update: {},
    create: {
      email: 'manager@demo.com',
      name: 'Demo Manager',
      passwordHash: companyAdminHash,
      companyId: demoCompany.id,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: companyAdmin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: companyAdmin.id, roleId: adminRole.id },
  });
  console.log('✅ Company admin seeded  →  manager@demo.com / password123  (company: demo)');

  // ── Company Viewer User ────────────────────────────────────────────────────
  const viewerHash = await bcrypt.hash('password123', 12);
  const viewerUser = await prisma.user.upsert({
    where: { email_companyId: { email: 'viewer@demo.com', companyId: demoCompany.id } },
    update: {},
    create: {
      email: 'viewer@demo.com',
      name: 'Demo Viewer',
      passwordHash: viewerHash,
      companyId: demoCompany.id,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: viewerUser.id, roleId: viewerRole.id } },
    update: {},
    create: { userId: viewerUser.id, roleId: viewerRole.id },
  });
  console.log('✅ Viewer user seeded  →  viewer@demo.com / password123  (company: demo)');

  // ── Demo HR Admin User ─────────────────────────────────────────────────────
  const hrAdminHash = await bcrypt.hash('password123', 12);
  const hrAdminUser = await prisma.user.upsert({
    where: { email_companyId: { email: 'hradmin@demo.com', companyId: demoCompany.id } },
    update: {},
    create: {
      email: 'hradmin@demo.com',
      name: 'HR Administrator',
      passwordHash: hrAdminHash,
      companyId: demoCompany.id,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: hrAdminUser.id, roleId: hrAdminRole.id } },
    update: {},
    create: { userId: hrAdminUser.id, roleId: hrAdminRole.id },
  });

  // Assign HR modules directly to HR Admin user
  const hrModules = await prisma.systemModule.findMany({ where: { slug: { in: HR_MODULE_SLUGS } } });
  for (const mod of hrModules) {
    await prisma.userModule.upsert({
      where: { userId_moduleId: { userId: hrAdminUser.id, moduleId: mod.id } },
      update: {},
      create: { userId: hrAdminUser.id, moduleId: mod.id },
    });
  }
  console.log('✅ HR Admin user seeded  →  hradmin@demo.com / password123  (company: demo)');

  console.log('\n🎉 Seed complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
