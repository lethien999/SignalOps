import { EventModel, EventRepository } from './event.repository';

describe('EventRepository', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('delegates findById to the mongoose model', async () => {
    const expected = { _id: 'event-1' };
    const findByIdSpy = jest.spyOn(EventModel, 'findById').mockReturnValue(expected as never);

    const repository = new EventRepository();
    await expect(repository.findById('event-1')).resolves.toBe(expected);

    expect(findByIdSpy).toHaveBeenCalledWith('event-1');
  });

  it('sets processedAt when updating processed time', async () => {
    const now = new Date('2026-04-28T10:15:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    const updateResult = { _id: 'event-2' };
    const updateSpy = jest
      .spyOn(EventModel, 'findByIdAndUpdate')
      .mockReturnValue(updateResult as never);

    const repository = new EventRepository();
    await expect(repository.updateProcessedTime('event-2')).resolves.toBe(updateResult);

    expect(updateSpy).toHaveBeenCalledWith(
      'event-2',
      { processedAt: now },
      { new: true, runValidators: true }
    );
  });

  it('links alerts and updates processedAt together', async () => {
    const now = new Date('2026-04-28T10:20:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    const updateResult = { _id: 'event-3' };
    const updateSpy = jest
      .spyOn(EventModel, 'findByIdAndUpdate')
      .mockReturnValue(updateResult as never);

    const repository = new EventRepository();
    await expect(repository.linkAlert('event-3', 'alert-3')).resolves.toBe(updateResult);

    expect(updateSpy).toHaveBeenCalledWith(
      'event-3',
      { alertId: 'alert-3', processedAt: now },
      { new: true, runValidators: true }
    );
  });
});
