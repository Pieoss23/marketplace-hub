import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthApiException } from './auth-api.exception';
import type { AuthenticatedUser, JwtPayload } from './authenticated-user';
import { hashPassword, verifyPassword } from './password-hasher';

export interface AuthResult {
  readonly accessToken: string;
  readonly user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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

  private buildResult(id: string, email: string): AuthResult {
    const payload: JwtPayload = { sub: id, email };
    return { accessToken: this.jwtService.sign(payload), user: { id, email } };
  }
}
