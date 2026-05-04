import { BadRequestException } from '@nestjs/common';
import { EventService } from './event.service';

describe('EventService', () => {
  const savedEvent = {
    _id: { toString: () => 'event-1' },
    toObject: () => ({
      deviceId: 'device-1',
      location: { lat: 10.7, lng: 106.6 },
      metrics: { latency: 120, packetLoss: 1, signalStrength: -70 },
      timestamp: new Date(),
    }),
  };

  it('createEvent saves event and queues job', async () => {
    const eventRepository = {
      save: jest.fn().mockResolvedValue(savedEvent),
      find: jest.fn(),
      findById: jest.fn(),
      countAll: jest.fn(),
      countEventsWithinPeriod: jest.fn(),
      findRecent: jest.fn(),
    };

    const eventBrokerService = {
      queueEvent: jest.fn().mockResolvedValue('job-1'),
    };

    const service = new EventService(eventRepository as never, eventBrokerService as never);

    const result = await service.createEvent({
      deviceId: 'device-1',
      location: { lat: 10.7, lng: 106.6 },
      metrics: { latency: 120, packetLoss: 1, signalStrength: -70 },
    });

    expect(eventRepository.save).toHaveBeenCalledTimes(1);
    expect(eventBrokerService.queueEvent).toHaveBeenCalledTimes(1);
    expect(eventBrokerService.queueEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'event-1',
        deviceId: 'device-1',
      }),
    );
    expect(result).toEqual({
      id: 'event-1',
      status: 'queued',
      jobId: 'job-1',
    });
  });

  it('createEvent propagates repository validation errors and does not queue job', async () => {
    const eventRepository = {
      save: jest.fn().mockRejectedValue(new BadRequestException('invalid payload')),
      find: jest.fn(),
      findById: jest.fn(),
      countAll: jest.fn(),
      countEventsWithinPeriod: jest.fn(),
      findRecent: jest.fn(),
    };

    const eventBrokerService = {
      queueEvent: jest.fn(),
    };

    const service = new EventService(eventRepository as never, eventBrokerService as never);

    await expect(
      service.createEvent({
        deviceId: 'device-1',
        location: { lat: 10.7, lng: 106.6 },
        metrics: { latency: Number.NaN, packetLoss: 1, signalStrength: -70 },
      }),
    ).rejects.toThrow(BadRequestException);

    expect(eventBrokerService.queueEvent).not.toHaveBeenCalled();
  });

  it('parseEventFilters normalizes values and parses dates', () => {
    const service = new EventService({} as never, {} as never);

    const result = service.parseEventFilters({
      skip: -5,
      limit: 999,
      deviceId: 'device-2',
      startDate: '2026-04-20T00:00:00.000Z',
      endDate: '2026-04-21T00:00:00.000Z',
    });

    expect(result.skip).toBe(0);
    expect(result.limit).toBe(200);
    expect(result.deviceId).toBe('device-2');
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
  });

  it('parseEventFilters throws on invalid date', () => {
    const service = new EventService({} as never, {} as never);

    expect(() =>
      service.parseEventFilters({
        skip: 0,
        limit: 10,
        startDate: 'invalid-date',
      }),
    ).toThrow(BadRequestException);
  });

  it('listEvents returns data with pagination', async () => {
    const eventRepository = {
      find: jest.fn().mockResolvedValue({ data: [{ id: 'e1' }], total: 1 }),
    };
    const service = new EventService(eventRepository as never, {} as never);

    const result = await service.listEvents({ skip: 0, limit: 10 });

    expect(result.pagination.total).toBe(1);
    expect(result.data).toHaveLength(1);
  });

  it('getEvent and count methods delegate to repository', async () => {
    const eventRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'e1' }),
      countAll: jest.fn().mockResolvedValue(123),
      countEventsWithinPeriod: jest.fn().mockResolvedValue(7),
    };
    const service = new EventService(eventRepository as never, {} as never);

    await expect(service.getEvent('e1')).resolves.toEqual({ id: 'e1' });
    await expect(service.countTotalEvents()).resolves.toBe(123);
    await expect(service.countEventsPerMinute()).resolves.toBe(7);
  });

  it('getDevices derives latest event per device', async () => {
    const now = new Date();
    const old = new Date(now.getTime() - 60_000);

    const eventRepository = {
      findRecent: jest.fn().mockResolvedValue([
        {
          deviceId: 'device-1',
          location: { lat: 10.7, lng: 106.6, name: 'A' },
          metrics: { latency: 100, packetLoss: 1, signalStrength: -70 },
          createdAt: old,
        },
        {
          deviceId: 'device-1',
          location: { lat: 10.8, lng: 106.7, name: 'B' },
          metrics: { latency: 300, packetLoss: 10, signalStrength: -95 },
          createdAt: now,
        },
      ]),
    };
    const service = new EventService(eventRepository as never, {} as never);

    const devices = await service.getDevices();

    expect(devices).toHaveLength(1);
    expect(devices[0].status).toBe('alert');
    expect(devices[0].name).toBe('B');
  });
});
