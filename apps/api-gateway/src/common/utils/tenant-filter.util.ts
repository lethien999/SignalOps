import { Types } from 'mongoose';

/**
 * Build a MongoDB filter query with tenant isolation
 * Ensures queries are scoped to a specific tenant
 */
export function buildTenantFilter(
  tenantId: string | Types.ObjectId | null | undefined,
  additionalFilter: Record<string, any> = {},
): Record<string, any> {
  if (!tenantId) {
    return additionalFilter;
  }

  const tenantObjectId = tenantId instanceof Types.ObjectId ? tenantId : new Types.ObjectId(tenantId);

  return {
    ...additionalFilter,
    tenantId: tenantObjectId,
  };
}

/**
 * Verify that a user belongs to the tenant they're trying to access
 */
export function validateTenantAccess(
  userTenantId: string | Types.ObjectId,
  requestedTenantId: string | Types.ObjectId,
): boolean {
  const userTenant = userTenantId instanceof Types.ObjectId ? userTenantId.toString() : userTenantId;
  const requestedTenant = requestedTenantId instanceof Types.ObjectId ? requestedTenantId.toString() : requestedTenantId;

  return userTenant === requestedTenant;
}
