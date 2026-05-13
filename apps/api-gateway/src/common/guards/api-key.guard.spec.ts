import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

const apiKeyAdminService = {
  hasActiveKeys: jest.fn(async () => false),
  validateApiKey: jest.fn(async (value?: string) => value === 'valid-key'),
  markUsed: jest.fn(async () => undefined),
};

describe('ApiKeyGuard', () => {
  const originalApiKey = process.env.API_KEY;

  afterEach(() => {
    process.env.API_KEY = originalApiKey;
    jest.clearAllMocks();
  });

  function createContext(method = 'POST', headerValue?: string): ExecutionContext {
    const request = {
      method,
      headers: {
        'x-api-key': headerValue,
      },
      ip: '127.0.0.1',
      path: '/api/events',
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('allows request when API_KEY is not configured', async () => {
    delete process.env.API_KEY;
    apiKeyAdminService.hasActiveKeys.mockResolvedValue(false);
    const guard = new ApiKeyGuard(apiKeyAdminService as never);

    await expect(guard.canActivate(createContext('POST'))).resolves.toBe(true);
  });

  it('allows request when API key is valid', async () => {
    process.env.API_KEY = 'valid-key';
    apiKeyAdminService.hasActiveKeys.mockResolvedValue(true);
    const guard = new ApiKeyGuard(apiKeyAdminService as never);

    await expect(guard.canActivate(createContext('POST', 'valid-key'))).resolves.toBe(true);
  });

  it('throws 403 when API key is missing', async () => {
    process.env.API_KEY = 'valid-key';
    apiKeyAdminService.hasActiveKeys.mockResolvedValue(true);
    const guard = new ApiKeyGuard(apiKeyAdminService as never);

    await expect(guard.canActivate(createContext('POST'))).rejects.toBeInstanceOf(HttpException);

    try {
      await guard.canActivate(createContext('POST'));
    } catch (error) {
      const httpError = error as HttpException;
      expect(httpError.getStatus()).toBe(HttpStatus.FORBIDDEN);
    }
  });

  it('throws 403 when API key is invalid', async () => {
    process.env.API_KEY = 'valid-key';
    apiKeyAdminService.hasActiveKeys.mockResolvedValue(true);
    const guard = new ApiKeyGuard(apiKeyAdminService as never);

    await expect(guard.canActivate(createContext('POST', 'wrong-key'))).rejects.toBeInstanceOf(
      HttpException
    );

    try {
      await guard.canActivate(createContext('POST', 'wrong-key'));
    } catch (error) {
      const httpError = error as HttpException;
      expect(httpError.getStatus()).toBe(HttpStatus.FORBIDDEN);
    }
  });
});
