import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TenantService } from './tenant.service';
import { Tenant } from './schemas/tenant.schema';

describe('TenantService', () => {
  let service: TenantService;
  let mockModel: any;

  beforeEach(async () => {
    // Mock the Mongoose model
    mockModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: getModelToken(Tenant.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
  });

  describe('create', () => {
    it('should create a tenant with default quota', async () => {
      const dto = { name: 'test-tenant', description: 'Test' };
      const mockTenant = {
        _id: 'id123',
        name: 'test-tenant',
        apiKey: 'key-abc123',
        quota: { eventsPerMonth: 1000000, alertsPerMonth: 100000 },
        usage: { events: 0, alerts: 0, month: '2026-05' },
        status: 'active',
        description: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockModel.create.mockResolvedValue(mockTenant);

      const result = await service.create(dto);

      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-tenant',
          quota: { eventsPerMonth: 1000000, alertsPerMonth: 100000 },
        })
      );
      expect(result.name).toBe('test-tenant');
      expect(result.apiKeyPreview).toMatch(/^.{8}\.\.\..*$/);
    });
  });

  describe('recordEventIngest', () => {
    it('should allow ingest if under quota', async () => {
      const mockTenant = {
        _id: 'id123',
        apiKey: 'key-abc',
        quota: { eventsPerMonth: 1000, alertsPerMonth: 100 },
        usage: { events: 500, alerts: 10, month: '2026-05' },
        save: jest.fn().mockResolvedValue(undefined),
      };

      mockModel.findOne.mockResolvedValue(mockTenant);

      const result = await service.recordEventIngest('key-abc', 1);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(499); // 1000 - 501
      expect(mockTenant.save).toHaveBeenCalled();
    });

    it('should reject ingest if quota exceeded', async () => {
      const mockTenant = {
        _id: 'id123',
        apiKey: 'key-abc',
        quota: { eventsPerMonth: 100, alertsPerMonth: 100 },
        usage: { events: 100, alerts: 10, month: '2026-05' },
      };

      mockModel.findOne.mockResolvedValue(mockTenant);

      const result = await service.recordEventIngest('key-abc', 1);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset usage if month changed', async () => {
      const lastMonth = new Date(new Date().setDate(1));
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStr = lastMonth.toISOString().slice(0, 7);

      const mockTenant = {
        _id: 'id123',
        apiKey: 'key-abc',
        quota: { eventsPerMonth: 1000, alertsPerMonth: 100 },
        usage: { events: 950, alerts: 90, month: lastMonthStr },
        save: jest.fn().mockResolvedValue(undefined),
      };

      mockModel.findOne.mockResolvedValue(mockTenant);

      const result = await service.recordEventIngest('key-abc', 1);

      expect(mockTenant.usage.events).toBe(1); // Reset + 1
      expect(result.allowed).toBe(true);
    });
  });
});
