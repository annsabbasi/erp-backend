import { SetMetadata } from '@nestjs/common';

export const AUDITED_KEY = 'audited';

export interface AuditedConfig {
  /** Canonical event key, e.g. "role.cloned" or "company.deleted". */
  action: string;
  /** Type of the entity being acted on (e.g. "role", "subscription"). */
  refType?: string;
  /**
   * Where to find the entity id. Defaults to the route param "id".
   *   "param:id"        — req.params.id
   *   "result:id"       — return value's `.id` field
   *   "body:roleId"     — req.body.roleId
   */
  refIdFrom?: string;
  /** Activity log module bucket (defaults to refType or "system"). */
  module?: string;
  /**
   * If false, skip writing a parallel ActivityLog row. Defaults to true.
   */
  alsoActivityLog?: boolean;
}

/**
 * Marks a controller method as auditable. The AuditInterceptor reads this
 * config and writes an AuditEvent (and an ActivityLog mirror by default)
 * after the method resolves successfully.
 *
 *   @Audited({ action: 'role.deleted', refType: 'role', refIdFrom: 'param:id' })
 */
export const Audited = (config: AuditedConfig) => SetMetadata(AUDITED_KEY, config);
