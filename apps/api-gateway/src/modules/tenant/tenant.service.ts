import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from './schemas/tenant.schema';
import { BusinessMetrics } from '../health/business-metrics';
import { generateRandomApiKey } from '../../common/api-key.utils';
import { Logger } from '../../common/logger';

export type CreateTenantDto = {
  name: string;
  eventsPerMonth?: number;
  alertsPerMonth?: number;
  description?: string;
};

export type UpdateTenantDto = {
  name?: string;
  eventsPerMonth?: number;
  alertsPerMonth?: number;
  status?: 'active' | 'suspended' | 'deleted';
  description?: string;
};

export type TenantView = {
  id: string;
  name: string;
  apiKey: string;
  apiKeyPreview: string;
  quota: { eventsPerMonth: number; alertsPerMonth: number };
  usage: { events: number; alerts: number; month: string };
  usagePercent: { events: number; alerts: number };
  status: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class TenantService {
  constructor(@InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>) {}

  async create(dto: CreateTenantDto): Promise<TenantView> {
    const apiKey = generateRandomApiKey();
    const eventsPerMonth = dto.eventsPerMonth ?? parseInt(process.env.TENANT_QUOTA_EVENTS_DEFAULT || '1000000', 10);
    const alertsPerMonth = dto.alertsPerMonth ?? parseInt(process.env.TENANT_QUOTA_ALERTS_DEFAULT || '100000', 10);

    const tenant = await this.tenantModel.create({
      name: dto.name,
      apiKey,
      quota: { eventsPerMonth, alertsPerMonth },
      usage: {
        events: 0,
        alerts: 0,
        month: new Date().toISOString().slice(0, 7),
      },
      status: 'active',
      description: dto.description,
    });

    Logger.info(`Tenant created: ${tenant.name} (${tenant._id})`);
    return this.toView(tenant);
  }

  async list(status?: string): Promise<TenantView[]> {
    const query = status ? { status } : {};
    const tenants = await this.tenantModel.find(query).sort({ createdAt: -1 });
    return tenants.map((t) => this.toView(t));
  }

  async getById(id: string): Promise<TenantView> {
    const tenant = await this.tenantModel.findById(id);
    if (!tenant) throw new NotFoundException(`Tenant not found: ${id}`);
    return this.toView(tenant);
  }

  async getByApiKey(apiKey: string): Promise<TenantView | null> {
    const tenant = await this.tenantModel.findOne({ apiKey });
    return tenant ? this.toView(tenant) : null;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<TenantView> {
    const tenant = await this.tenantModel.findByIdAndUpdate(
      id,
      {
        ...(dto.name && { name: dto.name }),
        ...(dto.status && { status: dto.status }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.eventsPerMonth && { 'quota.eventsPerMonth': dto.eventsPerMonth }),
        ...(dto.alertsPerMonth && { 'quota.alertsPerMonth': dto.alertsPerMonth }),
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!tenant) throw new NotFoundException(`Tenant not found: ${id}`);
    Logger.info(`Tenant updated: ${tenant.name} (${id})`);
    return this.toView(tenant);
  }

  async delete(id: string): Promise<void> {
    const result = await this.tenantModel.findByIdAndUpdate(id, { status: 'deleted', updatedAt: new Date() });
    if (!result) throw new NotFoundException(`Tenant not found: ${id}`);
    Logger.info(`Tenant deleted (soft): ${id}`);
  }

  /**
   * Increment event count for tenant + check quota
   * Returns { allowed: boolean, remaining: number }
   */
  async recordEventIngest(apiKey: string, count: number = 1): Promise<{ allowed: boolean; remaining: number }> {
    const tenant = await this.tenantModel.findOne({ apiKey, status: 'active' });
    if (!tenant) {
      return { allowed: false, remaining: 0 };
    }

    // Reset usage if month changed
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (tenant.usage.month !== currentMonth) {
      tenant.usage = { events: 0, alerts: 0, month: currentMonth };
    }

    const newCount = tenant.usage.events + count;
    const quota = tenant.quota.eventsPerMonth;

    if (newCount > quota) {
      Logger.warn(`Tenant ${tenant.name} quota exceeded: events ${newCount}/${quota}`);
      BusinessMetrics.recordTenantQuotaExceeded(tenant.name, 'events');
      return { allowed: false, remaining: 0 };
    }

    // Update usage
    tenant.usage.events = newCount;
    await tenant.save();

    // Record metrics
    const remaining = quota - newCount;
    BusinessMetrics.recordTenantUsage(tenant.name, 'events', newCount, quota);

    // Warn at 80%
    if (newCount >= quota * 0.8) {
      Logger.warn(`Tenant ${tenant.name} approaching quota: events ${newCount}/${quota} (80% threshold)`);
    }

    return { allowed: true, remaining };
  }

  /**
   * Increment alert count for tenant + check quota
   */
  async recordAlertCreation(apiKey: string, count: number = 1): Promise<{ allowed: boolean; remaining: number }> {
    const tenant = await this.tenantModel.findOne({ apiKey, status: 'active' });
    if (!tenant) {
      return { allowed: false, remaining: 0 };
    }

    // Reset usage if month changed
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (tenant.usage.month !== currentMonth) {
      tenant.usage = { events: 0, alerts: 0, month: currentMonth };
    }

    const newCount = tenant.usage.alerts + count;
    const quota = tenant.quota.alertsPerMonth;

    if (newCount > quota) {
      Logger.warn(`Tenant ${tenant.name} alert quota exceeded: ${newCount}/${quota}`);
      BusinessMetrics.recordTenantQuotaExceeded(tenant.name, 'alerts');
      return { allowed: false, remaining: 0 };
    }

    tenant.usage.alerts = newCount;
    await tenant.save();

    const remaining = quota - newCount;
    BusinessMetrics.recordTenantUsage(tenant.name, 'alerts', newCount, quota);

    if (newCount >= quota * 0.8) {
      Logger.warn(`Tenant ${tenant.name} approaching alert quota: ${newCount}/${quota} (80% threshold)`);
    }

    return { allowed: true, remaining };
  }

  private toView(tenant: TenantDocument): TenantView {
    const eventUsagePercent = (tenant.usage.events / tenant.quota.eventsPerMonth) * 100;
    const alertUsagePercent = (tenant.usage.alerts / tenant.quota.alertsPerMonth) * 100;
    const keyPreview = `${tenant.apiKey.slice(0, 8)}...${tenant.apiKey.slice(-4)}`;

    return {
      id: tenant._id.toString(),
      name: tenant.name,
      apiKey: tenant.apiKey,
      apiKeyPreview: keyPreview,
      quota: tenant.quota,
      usage: tenant.usage,
      usagePercent: {
        events: Math.round(eventUsagePercent * 10) / 10,
        alerts: Math.round(alertUsagePercent * 10) / 10,
      },
      status: tenant.status,
      description: tenant.description,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }
}
