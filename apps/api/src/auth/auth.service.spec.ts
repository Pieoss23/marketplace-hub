import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthApiException } from './auth-api.exception';
import { AuthService } from './auth.service';
import { hashPassword } from './password-hasher';

function buildPrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  } as unknown as PrismaService & { user: { findUnique: jest.Mock; create: jest.Mock } };
}

function buildJwtService() {
  return { sign: jest.fn().mockReturnValue('signed.jwt.token') } as unknown as JwtService;
}

describe('AuthService', () => {
  it('signs up a new user with a normalized email and hashed password', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'user-1', ...data }),
    );
    const jwtService = buildJwtService();
    const service = new AuthService(prisma, jwtService);

    const result = await service.signup('Test@Example.com', 'password1234');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'test@example.com' }),
    });
    expect(result).toEqual({
      accessToken: 'signed.jwt.token',
      user: { id: 'user-1', email: 'test@example.com' },
    });
  });

  it('rejects signup when the email is already registered', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
    const service = new AuthService(prisma, buildJwtService());

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
    const service = new AuthService(prisma, buildJwtService());

    const result = await service.login('test@example.com', 'password1234');

    expect(result.user).toEqual({ id: 'user-1', email: 'test@example.com' });
    expect(result.accessToken).toBe('signed.jwt.token');
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
    const service = new AuthService(prisma, buildJwtService());

    await expect(service.login('test@example.com', 'wrong-password')).rejects.toBeInstanceOf(
      AuthApiException,
    );
  });

  it('rejects login for a non-existent user', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new AuthService(prisma, buildJwtService());

    await expect(service.login('missing@example.com', 'password1234')).rejects.toBeInstanceOf(
      AuthApiException,
    );
  });
});
