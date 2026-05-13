import { AlertModel, AlertRepository } from './alert.repository';

describe('AlertRepository', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('creates alerts through the mongoose model save path', async () => {
    const savedAlert = { _id: 'alert-1', alertId: 'alert-1' };
    const saveSpy = jest.spyOn(AlertModel.prototype, 'save').mockResolvedValue(savedAlert as never);

    const repository = new AlertRepository();
    await expect(
      repository.create({
        alertId: 'alert-1',
        deviceId: 'device-1',
        type: 'latency',
        severity: 'high',
        location: { lat: 10.77, lng: 106.7, name: 'HCM' },
        message: 'High latency detected',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        eventId: 'event-1',
      })
    ).resolves.toBe(savedAlert);

    expect(saveSpy).toHaveBeenCalled();
  });

  it('finds open duplicates using the expected query shape', async () => {
    const duplicate = { _id: 'alert-2' };
    const findOneSpy = jest.spyOn(AlertModel, 'findOne').mockReturnValue(duplicate as never);

    const repository = new AlertRepository();
    await expect(repository.findOpenDuplicate('device-1', 'latency')).resolves.toBe(duplicate);

    expect(findOneSpy).toHaveBeenCalledWith({
      deviceId: 'device-1',
      type: 'latency',
      status: 'open',
    });
  });

  it('updates, acknowledges, and resolves alerts with timestamps', async () => {
    const now = new Date('2026-04-28T10:30:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    const updateResult = { _id: 'alert-3' };
    const updateSpy = jest
      .spyOn(AlertModel, 'findByIdAndUpdate')
      .mockReturnValue(updateResult as never);

    const repository = new AlertRepository();

    await expect(repository.update('alert-3', { status: 'acknowledged' })).resolves.toBe(
      updateResult
    );
    expect(updateSpy).toHaveBeenCalledWith(
      'alert-3',
      { status: 'acknowledged' },
      { new: true, runValidators: true }
    );

    await expect(repository.acknowledge('alert-3', 'operator-1')).resolves.toBe(updateResult);
    expect(updateSpy).toHaveBeenCalledWith(
      'alert-3',
      {
        status: 'acknowledged',
        acknowledgedBy: 'operator-1',
        acknowledgedAt: now,
      },
      { new: true, runValidators: true }
    );

    await expect(repository.resolve('alert-3')).resolves.toBe(updateResult);
    expect(updateSpy).toHaveBeenCalledWith(
      'alert-3',
      {
        status: 'resolved',
        resolvedAt: now,
      },
      { new: true, runValidators: true }
    );
  });

  it('finds alerts by id through the mongoose model', async () => {
    const alert = { _id: 'alert-4' };
    const findByIdSpy = jest.spyOn(AlertModel, 'findById').mockReturnValue(alert as never);

    const repository = new AlertRepository();
    await expect(repository.findById('alert-4')).resolves.toBe(alert);

    expect(findByIdSpy).toHaveBeenCalledWith('alert-4');
  });
});
