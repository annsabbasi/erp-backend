import { Injectable, Logger } from '@nestjs/common';
import { PermissionScope, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getTemplate } from './templates/registry';
import type { IndustryTemplate } from './templates/template.types';

/**
 * Applies an IndustryTemplate to a fresh (or existing) Company:
 *
 *   • Sets profile fields (currency, locale, timezone, fiscalYearStart, branding).
 *   • Enables every default module that is BOTH on the subscription's plan AND
 *     in the template's list. Modules outside the plan are skipped — the spec
 *     calls this out as a hard subscription gate (Section 4.3).
 *   • Seeds default roles, attaching system PermissionSets and/or direct
 *     permission keys.
 *
 * The operation is idempotent: re-applying a template upserts modules and
 * roles by name, refreshing description/scope but never deleting custom roles
 * the company has added in the meantime.
 */
@Injectable()
export class TemplateApplierService {
  private readonly logger = new Logger(TemplateApplierService.name);

  constructor(private readonly prisma: PrismaService) {}

  async apply(companyId: string, templateKey: string) {
    const template = getTemplate(templateKey);

    const planModuleIds = await this.planModuleIds(companyId);

    await this.prisma.$transaction(async (tx) => {
      // Profile + branding
      await tx.company.update({
        where: { id: companyId },
        data: {
          industry: template.key,
          templateApplied: template.key,
          currency: template.profile?.currency ?? undefined,
          locale: template.profile?.locale ?? undefined,
          timezone: template.profile?.timezone ?? undefined,
          fiscalYearStart: template.profile?.fiscalYearStart ?? undefined,
          branding: template.terminology
            ? ({ terminologyOverrides: template.terminology } as Prisma.InputJsonValue)
            : undefined,
        },
      });

      // Modules — only those on the plan
      await this.enableModules(tx, companyId, template, planModuleIds);

      // Roles
      await this.seedRoles(tx, companyId, template);
    });

    this.logger.log(`Template "${template.key}" applied to company ${companyId}`);
    return { template: template.key, version: template.version };
  }

  private async planModuleIds(companyId: string): Promise<Set<string>> {
    const sub = await this.prisma.subscription.findUnique({
      where: { companyId },
      include: { plan: { include: { modules: true } } },
    });
    if (!sub) return new Set(); // no subscription → no modules pass the gate
    return new Set(sub.plan.modules.map((m) => m.moduleId));
  }

  private async enableModules(
    tx: Prisma.TransactionClient,
    companyId: string,
    template: IndustryTemplate,
    planModuleIds: Set<string>,
  ) {
    if (!template.defaultModuleSlugs.length) return;

    const modules = await tx.systemModule.findMany({
      where: { slug: { in: template.defaultModuleSlugs } },
    });

    for (const mod of modules) {
      // Skip silently if the plan doesn't include this module (Section 4.3 gate).
      if (!planModuleIds.has(mod.id)) continue;
      await tx.companyModule.upsert({
        where: { companyId_moduleId: { companyId, moduleId: mod.id } },
        update: { isEnabled: true },
        create: { companyId, moduleId: mod.id, isEnabled: true },
      });
    }
  }

  private async seedRoles(
    tx: Prisma.TransactionClient,
    companyId: string,
    template: IndustryTemplate,
  ) {
    for (const r of template.defaultRoles) {
      const role = await tx.role.upsert({
        where: { name_companyId: { name: r.name, companyId } },
        update: {
          description: r.description,
          domain: r.domain,
          isDefault: r.isDefault ?? false,
          defaultScope: r.defaultScope ?? PermissionScope.ALL,
        },
        create: {
          name: r.name,
          description: r.description,
          companyId,
          domain: r.domain,
          isDefault: r.isDefault ?? false,
          defaultScope: r.defaultScope ?? PermissionScope.ALL,
        },
      });

      // Reset attachments so the role state reflects the latest template.
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      await tx.rolePermissionSet.deleteMany({ where: { roleId: role.id } });

      if (r.permissionSetKeys?.length) {
        const sets = await tx.permissionSet.findMany({
          where: { isSystem: true, key: { in: r.permissionSetKeys } },
        });
        if (sets.length) {
          await tx.rolePermissionSet.createMany({
            data: sets.map((s) => ({ roleId: role.id, setId: s.id })),
            skipDuplicates: true,
          });
        }
      }

      if (r.permissionKeys?.length) {
        const perms = await tx.permission.findMany({
          where: { key: { in: r.permissionKeys } },
        });
        if (perms.length) {
          await tx.rolePermission.createMany({
            data: perms.map((p) => ({
              roleId: role.id,
              permissionId: p.id,
              scope: r.defaultScope ?? PermissionScope.ALL,
            })),
            skipDuplicates: true,
          });
        }
      }
    }
  }
}
