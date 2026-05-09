import { Types } from 'mongoose';
import { buildTenantFilter, validateTenantAccess } from './tenant-filter.util';

describe('TenantFilterUtil', () => {
  describe('buildTenantFilter', () => {
    it('should add tenantId to filter when provided as string', () => {
      const tenantId = new Types.ObjectId().toString();
      const additionalFilter = { status: 'active' };

      const result = buildTenantFilter(tenantId, additionalFilter);

      expect(result).toHaveProperty('tenantId');
      expect(result.status).toBe('active');
    });

    it('should add tenantId to filter when provided as ObjectId', () => {
      const tenantId = new Types.ObjectId();
      const additionalFilter = { status: 'active' };

      const result = buildTenantFilter(tenantId, additionalFilter);

      expect(result).toHaveProperty('tenantId');
      expect(result.tenantId).toEqual(tenantId);
      expect(result.status).toBe('active');
    });

    it('should return only additionalFilter when tenantId is null', () => {
      const additionalFilter = { status: 'active' };

      const result = buildTenantFilter(null, additionalFilter);

      expect(result).toEqual(additionalFilter);
      expect(result).not.toHaveProperty('tenantId');
    });

    it('should return only additionalFilter when tenantId is undefined', () => {
      const additionalFilter = { status: 'active' };

      const result = buildTenantFilter(undefined, additionalFilter);

      expect(result).toEqual(additionalFilter);
      expect(result).not.toHaveProperty('tenantId');
    });

    it('should work with empty additionalFilter', () => {
      const tenantId = new Types.ObjectId().toString();

      const result = buildTenantFilter(tenantId, {});

      expect(result).toHaveProperty('tenantId');
      expect(Object.keys(result).length).toBe(1);
    });
  });

  describe('validateTenantAccess', () => {
    it('should return true when user and requested tenant match (both string)', () => {
      const tenantId = new Types.ObjectId().toString();

      const result = validateTenantAccess(tenantId, tenantId);

      expect(result).toBe(true);
    });

    it('should return true when user and requested tenant match (both ObjectId)', () => {
      const tenantId = new Types.ObjectId();

      const result = validateTenantAccess(tenantId, tenantId);

      expect(result).toBe(true);
    });

    it('should return true when user and requested tenant match (string vs ObjectId)', () => {
      const tenantId = new Types.ObjectId();
      const tenantIdStr = tenantId.toString();

      const result = validateTenantAccess(tenantIdStr, tenantId);

      expect(result).toBe(true);
    });

    it('should return false when user and requested tenant do not match', () => {
      const userTenantId = new Types.ObjectId();
      const requestedTenantId = new Types.ObjectId();

      const result = validateTenantAccess(userTenantId, requestedTenantId);

      expect(result).toBe(false);
    });
  });
});
