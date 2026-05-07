import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Alert } from './schemas/alert.schema';
import { Logger } from '../../common/logger';
import { randomUUID } from 'crypto';
import { AlertFindFilters, AlertHistoryFilters, AlertRepository, AlertSlaFilters, AlertSlaSnapshot, AlertStatusUpdate } from './repositories/alert.repository';
import { AlertsGateway, AlertEmissionPayload } from '../websocket/alerts.gateway';
import { BusinessMetrics } from '../health/business-metrics';

export type CreateAlertInput = {
  alertId?: string;
  deviceId: string;
  type: 'latency' | 'packet_loss' | 'signal';
  severity: 'low' | 'medium' | 'high';
  location: {
    lat: number;
    lng: number;
    name?: string;
  };
  message: string;
  status?: 'open' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  eventId?: string;
};

export type UpdateAlertInput = {
  status?: 'open' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNote?: string;
};

export type AlertSummary = {
  open: number;
  acknowledged: number;
  resolved: number;
  highOpen: number;
};

export type BatchUpdateResult = {
  success: number;
  failed: number;
  errors: string[];
};

@Injectable()
export class AlertService {
  constructor(
    private readonly alertRepository: AlertRepository,
    private readonly alertsGateway: AlertsGateway,
  ) {}

  async createAlert(alertData: CreateAlertInput): Promise<Alert> {
    try {
      const alert = {
        alertId: alertData.alertId || randomUUID(),
        ...alertData,
      };
      const savedAlert = await this.alertRepository.save(alert);
      
      // Record metrics
      BusinessMetrics.recordAlertCreated(savedAlert.type, savedAlert.severity);
      
      Logger.info(`Alert created: ${savedAlert._id}`);

      // Emit alert:new to WebSocket clients
      if (savedAlert && savedAlert._id) {
        const emissionPayload: AlertEmissionPayload = {
          id: savedAlert._id.toString(),
          alertId: savedAlert.alertId,
          type: savedAlert.type,
          severity: savedAlert.severity,
          location: savedAlert.location,
          message: savedAlert.message,
          timestamp: savedAlert.createdAt?.toISOString() || new Date().toISOString(),
          deviceId: savedAlert.deviceId,
        };
        this.alertsGateway.broadcastAlertNew(emissionPayload);
      }

      return savedAlert;
    } catch (error) {
      Logger.error('Failed to create alert', error);
      throw error;
    }
  }

  async listAlerts(filters: AlertFindFilters): Promise<{
    data: Alert[];
    pagination: { skip: number; limit: number; total: number };
    summary: AlertSummary;
  }> {
    try {
      const normalizedFilters: AlertFindFilters = {
        ...filters,
        skip: Math.max(filters.skip, 0),
        limit: Math.min(Math.max(filters.limit, 1), 200),
      };

      const { data, total, summary } = await this.alertRepository.find(normalizedFilters);

      return {
        data,
        pagination: {
          skip: normalizedFilters.skip,
          limit: normalizedFilters.limit,
          total,
        },
        summary,
      };
    } catch (error) {
      Logger.error('Failed to list alerts', error);
      throw error;
    }
  }

  async getAlert(id: string): Promise<Alert | null> {
    try {
      const alert = await this.alertRepository.findById(id);
      return alert;
    } catch (error) {
      Logger.error(`Failed to get alert ${id}`, error);
      throw error;
    }
  }

  async updateAlert(id: string, updateData: UpdateAlertInput): Promise<Alert | null> {
    try {
      const current = await this.alertRepository.findById(id);

      if (!current) {
        throw new NotFoundException(`Alert ${id} not found`);
      }

      const nextStatus = updateData.status || (current.status as 'open' | 'acknowledged' | 'resolved');

      this.assertTransitionAllowed(current.status as 'open' | 'acknowledged' | 'resolved', nextStatus);

      const normalizedUpdate = this.buildUpdatePayload(nextStatus, updateData);
      const alert = await this.alertRepository.updateStatus(id, normalizedUpdate);

      Logger.info(`Alert updated: ${id}`);

      // Emit appropriate WebSocket event based on status transition
      if (alert && alert._id) {
        const emissionPayload: AlertEmissionPayload = {
          id: alert._id.toString(),
          alertId: alert.alertId,
          type: alert.type,
          severity: alert.severity,
          location: alert.location,
          message: alert.message,
          timestamp: alert.updatedAt?.toISOString() || new Date().toISOString(),
          deviceId: alert.deviceId,
        };

        if (nextStatus === 'acknowledged') {
          this.alertsGateway.broadcastAlertAcknowledged(emissionPayload);
        } else if (nextStatus === 'resolved') {
          this.alertsGateway.broadcastAlertResolved(emissionPayload);
        }
      }

      return alert;
    } catch (error) {
      Logger.error(`Failed to update alert ${id}`, error);
      throw error;
    }
  }

  async countActiveAlerts(): Promise<number> {
    return this.alertRepository.countActiveAlerts();
  }

  private assertTransitionAllowed(
    current: 'open' | 'acknowledged' | 'resolved',
    next: 'open' | 'acknowledged' | 'resolved',
  ): void {
    if (current === next) {
      return;
    }

    const allowedTransitions: Record<'open' | 'acknowledged' | 'resolved', Array<'open' | 'acknowledged' | 'resolved'>> = {
      open: ['acknowledged'],
      acknowledged: ['resolved'],
      resolved: [],
    };

    if (!allowedTransitions[current].includes(next)) {
      throw new BadRequestException(`Invalid status transition: ${current} -> ${next}`);
    }
  }

  private buildUpdatePayload(
    status: 'open' | 'acknowledged' | 'resolved',
    updateData: UpdateAlertInput,
  ): AlertStatusUpdate {
    const payload: AlertStatusUpdate = { status };

    if (status === 'acknowledged') {
      payload.acknowledgedBy = updateData.acknowledgedBy;
      payload.acknowledgedAt = updateData.acknowledgedAt || new Date();
    }

    if (status === 'resolved') {
      payload.resolvedAt = updateData.resolvedAt || new Date();
      payload.resolvedBy = updateData.resolvedBy;
      payload.resolutionNote = updateData.resolutionNote;
    }

    return payload;
  }

  async getAlertHistory(filters: AlertHistoryFilters = {}) {
    return this.alertRepository.alertHistory(filters);
  }

  async exportAlertHistoryCsv(filters: AlertHistoryFilters = {}): Promise<string> {
    const rows = await this.alertRepository.alertHistory(filters);
    return this.alertRepository.buildAlertHistoryCsv(rows);
  }

  async getSlaSnapshot(filters: AlertSlaFilters = {}): Promise<AlertSlaSnapshot> {
    return this.alertRepository.getSlaSnapshot(filters);
  }

  async batchAcknowledge(ids: string[], acknowledgedBy?: string): Promise<BatchUpdateResult> {
    return this.batchUpdate(ids, {
      status: 'acknowledged',
      acknowledgedBy,
    });
  }

  async batchResolve(ids: string[], resolvedBy?: string, resolutionNote?: string): Promise<BatchUpdateResult> {
    return this.batchUpdate(ids, {
      status: 'resolved',
      resolvedBy,
      resolutionNote,
    });
  }

  private async batchUpdate(ids: string[], input: UpdateAlertInput): Promise<BatchUpdateResult> {
    const results: BatchUpdateResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const id of ids || []) {
      try {
        await this.updateAlert(id, input);
        results.success += 1;
      } catch (error) {
        results.failed += 1;
        results.errors.push(`${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }
}
