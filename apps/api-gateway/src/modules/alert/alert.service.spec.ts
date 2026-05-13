import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AlertService } from './alert.service';

describe('AlertService', () => {
  it('createAlert saves alert and emits websocket event', async () => {
    const alertRepository = {
      save: jest.fn().mockResolvedValue({
        _id: { toString: () => 'alert-1' },
        alertId: 'alert-1',
        type: 'latency',
        severity: 'high',
        location: { lat: 10.7, lng: 106.6 },
        message: 'm1',
        deviceId: 'd1',
        createdAt: new Date(),
      }),
    };

    const alertsGateway = {
      broadcastAlertNew: jest.fn(),
      broadcastAlertAcknowledged: jest.fn(),
      broadcastAlertResolved: jest.fn(),
    };

    const service = new AlertService(alertRepository as never, alertsGateway as never);
    const result = await service.createAlert({
      deviceId: 'd1',
      type: 'latency',
      severity: 'high',
      location: { lat: 10.7, lng: 106.6 },
      message: 'm1',
    });

    expect(result).toBeTruthy();
    expect(alertRepository.save).toHaveBeenCalledTimes(1);
    expect(alertsGateway.broadcastAlertNew).toHaveBeenCalledTimes(1);
  });

  it('enforces valid status transitions', async () => {
    const alertRepository = {
      findById: jest.fn().mockResolvedValue({
        _id: { toString: () => 'alert-1' },
        alertId: 'alert-1',
        type: 'latency',
        severity: 'high',
        location: { lat: 10.7, lng: 106.6 },
        message: 'test',
        deviceId: 'device-1',
        status: 'open',
      }),
      updateStatus: jest.fn().mockResolvedValue({
        _id: { toString: () => 'alert-1' },
        alertId: 'alert-1',
        type: 'latency',
        severity: 'high',
        location: { lat: 10.7, lng: 106.6 },
        message: 'test',
        deviceId: 'device-1',
        status: 'acknowledged',
        updatedAt: new Date(),
      }),
    };

    const alertsGateway = {
      broadcastAlertNew: jest.fn(),
      broadcastAlertAcknowledged: jest.fn(),
      broadcastAlertResolved: jest.fn(),
    };

    const service = new AlertService(alertRepository as never, alertsGateway as never);

    await expect(
      service.updateAlert('alert-1', {
        status: 'acknowledged',
        acknowledgedBy: 'operator',
      })
    ).resolves.toBeTruthy();

    alertRepository.findById.mockResolvedValueOnce({
      _id: { toString: () => 'alert-1' },
      status: 'resolved',
    });

    await expect(
      service.updateAlert('alert-1', {
        status: 'open',
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('throws not found when updating missing alert', async () => {
    const alertRepository = {
      findById: jest.fn().mockResolvedValue(null),
      updateStatus: jest.fn(),
    };

    const alertsGateway = {
      broadcastAlertNew: jest.fn(),
      broadcastAlertAcknowledged: jest.fn(),
      broadcastAlertResolved: jest.fn(),
    };

    const service = new AlertService(alertRepository as never, alertsGateway as never);

    await expect(service.updateAlert('missing', { status: 'acknowledged' })).rejects.toThrow(
      NotFoundException
    );
  });

  it('batchAcknowledge updates multiple alerts and reports failures', async () => {
    const alertRepository = {
      findById: jest
        .fn()
        .mockResolvedValueOnce({
          _id: { toString: () => 'a1' },
          alertId: 'a1',
          type: 'latency',
          severity: 'high',
          location: { lat: 1, lng: 1 },
          message: 'm1',
          deviceId: 'd1',
          status: 'open',
        })
        .mockResolvedValueOnce(null),
      updateStatus: jest.fn().mockResolvedValue({
        _id: { toString: () => 'a1' },
        alertId: 'a1',
        type: 'latency',
        severity: 'high',
        location: { lat: 1, lng: 1 },
        message: 'm1',
        deviceId: 'd1',
        status: 'acknowledged',
        updatedAt: new Date(),
      }),
    };

    const alertsGateway = {
      broadcastAlertNew: jest.fn(),
      broadcastAlertAcknowledged: jest.fn(),
      broadcastAlertResolved: jest.fn(),
    };

    const service = new AlertService(alertRepository as never, alertsGateway as never);
    const result = await service.batchAcknowledge(['a1', 'a2'], 'operator');

    expect(result.success).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it('list/get/count/history delegate to repository', async () => {
    const alertRepository = {
      find: jest.fn().mockResolvedValue({ data: [{ id: 'a1' }], total: 1 }),
      findById: jest.fn().mockResolvedValue({ id: 'a1' }),
      countActiveAlerts: jest.fn().mockResolvedValue(2),
      alertHistory: jest.fn().mockResolvedValue([{ date: '2026-04-29', total: 1 }]),
    };

    const alertsGateway = {
      broadcastAlertNew: jest.fn(),
      broadcastAlertAcknowledged: jest.fn(),
      broadcastAlertResolved: jest.fn(),
    };

    const service = new AlertService(alertRepository as never, alertsGateway as never);

    const listResult = await service.listAlerts({ skip: -1, limit: 999 });
    expect(listResult.pagination.skip).toBe(0);
    expect(listResult.pagination.limit).toBe(200);
    expect(listResult.pagination.total).toBe(1);

    await expect(service.getAlert('a1')).resolves.toEqual({ id: 'a1' });
    await expect(service.countActiveAlerts()).resolves.toBe(2);
    await expect(service.getAlertHistory(7)).resolves.toEqual([{ date: '2026-04-29', total: 1 }]);
  });

  it('batchResolve updates all valid alerts', async () => {
    const alertRepository = {
      findById: jest
        .fn()
        .mockResolvedValueOnce({
          _id: { toString: () => 'a1' },
          alertId: 'a1',
          type: 'latency',
          severity: 'high',
          location: { lat: 1, lng: 1 },
          message: 'm1',
          deviceId: 'd1',
          status: 'acknowledged',
        })
        .mockResolvedValueOnce({
          _id: { toString: () => 'a2' },
          alertId: 'a2',
          type: 'packet_loss',
          severity: 'high',
          location: { lat: 1, lng: 1 },
          message: 'm2',
          deviceId: 'd1',
          status: 'acknowledged',
        }),
      updateStatus: jest.fn().mockResolvedValue({
        _id: { toString: () => 'a1' },
        alertId: 'a1',
        type: 'latency',
        severity: 'high',
        location: { lat: 1, lng: 1 },
        message: 'm1',
        deviceId: 'd1',
        status: 'resolved',
        updatedAt: new Date(),
      }),
    };

    const alertsGateway = {
      broadcastAlertNew: jest.fn(),
      broadcastAlertAcknowledged: jest.fn(),
      broadcastAlertResolved: jest.fn(),
    };

    const service = new AlertService(alertRepository as never, alertsGateway as never);
    const result = await service.batchResolve(['a1', 'a2'], 'operator', 'resolved');

    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
  });
});
