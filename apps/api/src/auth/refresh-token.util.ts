import { createHash, randomBytes } from 'node:crypto';

const RAW_TOKEN_BYTES = 32;

export function generateRefreshToken(): string {
  return randomBytes(RAW_TOKEN_BYTES).toString('base64url');
}

export function hashRefreshToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
