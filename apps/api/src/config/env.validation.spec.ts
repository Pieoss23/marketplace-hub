import 'reflect-metadata';
import { validate } from './env.validation';

const validEnv = {
  API_PORT: '3000',
  API_GLOBAL_PREFIX: 'api',
  CORS_ORIGIN: 'http://localhost:4200',
  JWT_SECRET: 'a-secret-that-is-long-enough',
  JWT_EXPIRES_IN_SECONDS: '900',
  REFRESH_TOKEN_EXPIRES_IN_SECONDS: '2592000',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
};

describe('validate (environment variables)', () => {
  it('accepts a fully populated, well-formed environment', () => {
    expect(() => validate(validEnv)).not.toThrow();
  });

  it('accepts an environment with only the required DATABASE_URL set', () => {
    expect(() => validate({ DATABASE_URL: validEnv.DATABASE_URL })).not.toThrow();
  });

  it('rejects a missing DATABASE_URL', () => {
    const withoutDatabaseUrl: Record<string, string> = { ...validEnv };
    delete withoutDatabaseUrl['DATABASE_URL'];
    expect(() => validate(withoutDatabaseUrl)).toThrow(/DATABASE_URL/);
  });

  it('rejects a non-numeric API_PORT', () => {
    expect(() => validate({ ...validEnv, API_PORT: 'not-a-number' })).toThrow(/API_PORT/);
  });

  it('rejects a JWT_SECRET shorter than 16 characters', () => {
    expect(() => validate({ ...validEnv, JWT_SECRET: 'too-short' })).toThrow(/JWT_SECRET/);
  });
});
