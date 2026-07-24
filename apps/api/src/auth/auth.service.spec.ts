import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthApiException } from './auth-api.exception';
import { AuthService } from './auth.service';
import { hashPassword } from './password-hasher';
import { hashRefreshToken } from './refresh-token.util';

type MockPrisma = PrismaService & {
  user: { findUnique: jest.Mock; create: jest.Mock };
  refreshToken: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

function buildPrisma(): MockPrisma {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma: any = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  prisma.$transaction = jest.fn((callback: (tx: unknown) => unknown) => callback(prisma));
  return prisma as MockPrisma;
}

function buildJwtService() {
  return { sign: jest.fn().mockReturnValue('signed.jwt.token') } as unknown as JwtService;
}

function buildConfigService() {
  return {
    getOrThrow: jest.fn().mockReturnValue({
      jwtSecret: 'test-secret',
      jwtExpiresInSeconds: 900,
      refreshTokenExpiresInSeconds: 2_592_000,
    }),
  } as unknown as ConfigService;
}

describe('AuthService', () => {
  it('signs up a new user with a normalized email, hashed password and refresh token', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'user-1', ...data }),
    );
    const jwtService = buildJwtService();
    const service = new AuthService(prisma, jwtService, buildConfigService());

    const result = await service.signup('Test@Example.com', 'password1234');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'test@example.com' }),
    });
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        expiresAt: expect.any(Date),
      },
    });
    expect(result).toEqual({
      accessToken: 'signed.jwt.token',
      refreshToken: expect.any(String),
      user: { id: 'user-1', email: 'test@example.com' },
    });
    expect(result.refreshToken).not.toBe(result.accessToken);
  });

  it('rejects signup when the email is already registered', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
    const service = new AuthService(prisma, buildJwtService(), buildConfigService());

    await expect(service.signup('test@example.com', 'password1234')).rejects.toBeInstanceOf(
      AuthApiException,
    );
  });

  it('logs in a user with correct credentials', async () => {
    const { hash, salt } = await hashPassword('password1234');
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: hash,
      passwordSalt: salt,
    });
    const service = new AuthService(prisma, buildJwtService(), buildConfigService());

    const result = await service.login('test@example.com', 'password1234');

    expect(result.user).toEqual({ id: 'user-1', email: 'test@example.com' });
    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.refreshToken).toEqual(expect.any(String));
  });

  it('rejects login with an incorrect password', async () => {
    const { hash, salt } = await hashPassword('password1234');
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: hash,
      passwordSalt: salt,
    });
    const service = new AuthService(prisma, buildJwtService(), buildConfigService());

    await expect(service.login('test@example.com', 'wrong-password')).rejects.toBeInstanceOf(
      AuthApiException,
    );
  });

  it('rejects login for a non-existent user', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new AuthService(prisma, buildJwtService(), buildConfigService());

    await expect(service.login('missing@example.com', 'password1234')).rejects.toBeInstanceOf(
      AuthApiException,
    );
  });

  describe('refresh', () => {
    it('rotates a valid refresh token', async () => {
      const prisma = buildPrisma();
      const rawToken = 'valid-raw-token';
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: hashRefreshToken(rawToken),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        user: { id: 'user-1', email: 'test@example.com' },
      });
      const service = new AuthService(prisma, buildJwtService(), buildConfigService());

      const result = await service.refresh(rawToken);

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
          expiresAt: expect.any(Date),
        },
      });
      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        refreshToken: expect.any(String),
        user: { id: 'user-1', email: 'test@example.com' },
      });
    });

    it('rejects an unknown refresh token', async () => {
      const prisma = buildPrisma();
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      const service = new AuthService(prisma, buildJwtService(), buildConfigService());

      await expect(service.refresh('unknown-token')).rejects.toBeInstanceOf(AuthApiException);
    });

    it('rejects an expired but never-revoked token without mass-revoking', async () => {
      const prisma = buildPrisma();
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: hashRefreshToken('expired-token'),
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        user: { id: 'user-1', email: 'test@example.com' },
      });
      const service = new AuthService(prisma, buildJwtService(), buildConfigService());

      await expect(service.refresh('expired-token')).rejects.toBeInstanceOf(AuthApiException);
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('detects reuse of an already-revoked token and mass-revokes the user session', async () => {
      const prisma = buildPrisma();
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: hashRefreshToken('reused-token'),
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        user: { id: 'user-1', email: 'test@example.com' },
      });
      const service = new AuthService(prisma, buildJwtService(), buildConfigService());

      await expect(service.refresh('reused-token')).rejects.toBeInstanceOf(AuthApiException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('logout', () => {
    it('revokes the matching refresh token', async () => {
      const prisma = buildPrisma();
      const service = new AuthService(prisma, buildJwtService(), buildConfigService());

      await service.logout('some-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: hashRefreshToken('some-token'), revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
