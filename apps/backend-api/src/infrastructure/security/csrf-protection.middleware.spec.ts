import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CsrfProtectionMiddleware } from './csrf-protection.middleware';
import { Request, Response } from 'express';

describe('CsrfProtectionMiddleware', () => {
  let middleware: CsrfProtectionMiddleware;
  let mockConfigService: {
    get: jest.Mock;
  };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue: string) => {
        if (key === 'CSRF_PROTECTION_ENABLED') return 'true';
        if (key === 'CORS_ORIGINS') return 'http://localhost:3000';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsrfProtectionMiddleware,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    middleware = module.get<CsrfProtectionMiddleware>(CsrfProtectionMiddleware);
    process.env.APP_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.APP_ENV;
  });

  const createMockRequest = (overrides: Partial<Request> = {}): Request => {
    const headers = overrides.headers || {};
    return {
      method: 'GET',
      path: '/api/v1/test',
      get: (name: string) => {
        if (name.toLowerCase() === 'origin') return headers['origin'] as string;
        if (name.toLowerCase() === 'referer') return headers['referer'] as string;
        if (name.toLowerCase() === 'x-csrf-token') return headers['x-csrf-token'] as string;
        return undefined;
      },
      headers,
      ...overrides,
    } as unknown as Request;
  };

  const createMockResponse = (): Response => {
    return {} as unknown as Response;
  };

  it('should allow GET, HEAD, OPTIONS safe methods', () => {
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should bypass Csrf protection for safe public analytics event route', () => {
    const req = createMockRequest({ method: 'POST', path: '/analytics/event' });
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should successfully pass when double submit CSRF token matches', () => {
    const req = createMockRequest({
      method: 'POST',
      headers: {
        cookie: 'hyper_market_csrf_token=match-123; hyper_market_access_token=token-123',
        origin: 'http://localhost:3000',
        'x-csrf-token': 'match-123',
      },
    });
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should throw ForbiddenException if request origin is untrusted', () => {
    const req = createMockRequest({
      method: 'POST',
      headers: {
        cookie: 'hyper_market_csrf_token=match-123; hyper_market_access_token=token-123',
        origin: 'http://untrusted-domain.com',
        'x-csrf-token': 'match-123',
      },
    });
    const res = createMockResponse();
    const next = jest.fn();

    expect(() => middleware.use(req, res, next)).toThrow(ForbiddenException);
    expect(next).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException if double submit CSRF tokens are mismatched', () => {
    const req = createMockRequest({
      method: 'POST',
      headers: {
        cookie: 'hyper_market_csrf_token=match-123; hyper_market_access_token=token-123',
        origin: 'http://localhost:3000',
        'x-csrf-token': 'mismatched-token',
      },
    });
    const res = createMockResponse();
    const next = jest.fn();

    expect(() => middleware.use(req, res, next)).toThrow(ForbiddenException);
    expect(next).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException if CSRF token header is missing on an authenticated request', () => {
    const req = createMockRequest({
      method: 'POST',
      headers: {
        cookie: 'hyper_market_csrf_token=match-123; hyper_market_access_token=token-123',
        origin: 'http://localhost:3000',
      },
    });
    const res = createMockResponse();
    const next = jest.fn();

    expect(() => middleware.use(req, res, next)).toThrow(ForbiddenException);
    expect(next).not.toHaveBeenCalled();
  });
});
