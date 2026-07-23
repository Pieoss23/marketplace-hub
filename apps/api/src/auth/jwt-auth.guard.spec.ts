import type { ExecutionContext } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { AuthApiException } from './auth-api.exception';
import { JwtAuthGuard } from './jwt-auth.guard';

function buildContext(authorizationHeader: string | undefined) {
  const request = { headers: { authorization: authorizationHeader } } as unknown as {
    headers: { authorization?: string };
    user?: unknown;
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('JwtAuthGuard', () => {
  it('rejects a request without an Authorization header', () => {
    const { context } = buildContext(undefined);
    const jwtService = { verify: jest.fn() } as unknown as JwtService;
    const guard = new JwtAuthGuard(jwtService);

    expect(() => guard.canActivate(context)).toThrow(AuthApiException);
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('rejects a header that is not a Bearer token', () => {
    const { context } = buildContext('Basic abc123');
    const jwtService = { verify: jest.fn() } as unknown as JwtService;
    const guard = new JwtAuthGuard(jwtService);

    expect(() => guard.canActivate(context)).toThrow(AuthApiException);
  });

  it('rejects an invalid or expired token', () => {
    const { context } = buildContext('Bearer bad-token');
    const jwtService = {
      verify: jest.fn().mockImplementation(() => {
        throw new Error('invalid signature');
      }),
    } as unknown as JwtService;
    const guard = new JwtAuthGuard(jwtService);

    expect(() => guard.canActivate(context)).toThrow(AuthApiException);
  });

  it('attaches the decoded user to the request and allows the call through', () => {
    const { context, request } = buildContext('Bearer good-token');
    const jwtService = {
      verify: jest.fn().mockReturnValue({ sub: 'user-1', email: 'test@example.com' }),
    } as unknown as JwtService;
    const guard = new JwtAuthGuard(jwtService);

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({ id: 'user-1', email: 'test@example.com' });
  });
});
