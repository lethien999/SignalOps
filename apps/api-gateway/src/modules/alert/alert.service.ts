import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Alert } from './schemas/alert.schema';
import { Logger } from '../../common/logger';
import { randomUUID } from 'crypto';
import { AlertFindFilters, AlertRepository, AlertStatusUpdate } from './repositories/alert.repository';
import { AlertsGateway, AlertEmissionPayload } from '../websocket/alerts.gateway';

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
  }> {
    try {
      const normalizedFilters: AlertFindFilters = {
        ...filters,
        skip: Math.max(filters.skip, 0),
        limit: Math.min(Math.max(filters.limit, 1), 200),
      };

      const { data, total } = await this.alertRepository.find(normalizedFilters);

      return {
        data,
        pagination: {
          skip: normalizedFilters.skip,
          limit: normalizedFilters.limit,
          total,
        },
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
    }

    return payload;
  }
}
