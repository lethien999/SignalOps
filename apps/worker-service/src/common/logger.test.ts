import { Logger } from './logger';

describe('Logger', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('serializes info logs with data payloads', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    Logger.info('worker started', { queue: 'event-processing' });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.level).toBe('info');
    expect(payload.message).toBe('worker started');
    expect(payload.data).toEqual({ queue: 'event-processing' });
  });

  it('serializes errors consistently', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    Logger.error('failed to process job', new Error('boom'));

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(payload.level).toBe('error');
    expect(payload.message).toBe('failed to process job');
    expect(payload.error).toBe('boom');
  });

  it('serializes warnings consistently', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    Logger.warn('duplicate alert skipped', { deviceId: 'device-1' });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(payload.level).toBe('warn');
    expect(payload.message).toBe('duplicate alert skipped');
    expect(payload.data).toEqual({ deviceId: 'device-1' });
  });
});
