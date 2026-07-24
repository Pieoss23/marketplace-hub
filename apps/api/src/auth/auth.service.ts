import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { AuthApiException } from './auth-api.exception';
import type { AuthenticatedUser, JwtPayload } from './authenticated-user';
import { hashPassword, verifyPassword } from './password-hasher';
import { generateRefreshToken, hashRefreshToken } from './refresh-token.util';

export interface AuthResult {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: AuthenticatedUser;
}

type RefreshTokenClient = Pick<PrismaService, 'refreshToken'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(email: string, password: string): Promise<AuthResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw AuthApiException.emailAlreadyRegistered();
    }

    const { hash, salt } = await hashPassword(password);
    const user = await this.prisma.user.create({
      data: { email: normalizedEmail, passwordHash: hash, passwordSalt: salt },
    });

    return this.buildResult(user.id, user.email);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !(await verifyPassword(password, user.passwordHash, user.passwordSalt))) {
      throw AuthApiException.invalidCredentials();
    }

    return this.buildResult(user.id, user.email);
  }

  async refresh(rawToken: string): Promise<AuthResult> {
    const tokenHash = hashRefreshToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw AuthApiException.invalidRefreshToken();
    }

    if (stored.revokedAt) {
      // Reuse of an already-revoked token is treated as a compromise
      // signal: kill every active session for this user, forcing a full
      // re-login everywhere rather than just rejecting this one request.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw AuthApiException.refreshTokenReused();
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw AuthApiException.invalidRefreshToken();
    }

    const { refreshTokenExpiresInSeconds } = this.configService.getOrThrow<AuthConfig>('auth');

    const refreshToken = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
      return this.createRefreshToken(stored.userId, refreshTokenExpiresInSeconds, tx);
    });

    const payload: JwtPayload = { sub: stored.userId, email: stored.user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken,
      user: { id: stored.userId, email: stored.user.email },
    };
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(rawToken);
    // updateMany + no existence check: logout must stay idempotent and must
    // not leak whether the token existed or was already revoked.
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async buildResult(id: string, email: string): Promise<AuthResult> {
    const payload: JwtPayload = { sub: id, email };
    const { refreshTokenExpiresInSeconds } = this.configService.getOrThrow<AuthConfig>('auth');
    const refreshToken = await this.createRefreshToken(id, refreshTokenExpiresInSeconds);
    return { accessToken: this.jwtService.sign(payload), refreshToken, user: { id, email } };
  }

  private async createRefreshToken(
    userId: string,
    expiresInSeconds: number,
    client: RefreshTokenClient = this.prisma,
  ): Promise<string> {
    const rawToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    await client.refreshToken.create({
      data: { userId, tokenHash: hashRefreshToken(rawToken), expiresAt },
    });
    return rawToken;
  }
}
