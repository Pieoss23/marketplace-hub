import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildLoginUrl,
  buildLogoutUrl,
  buildRefreshUrl,
  login,
  logout,
  refreshSession,
} from '../src/lib/auth-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildLoginUrl', () => {
  it('normalizes auth endpoint URLs from the configured API base URL', () => {
    expect(buildLoginUrl(' http://localhost:3000/api/ ')).toBe(
      'http://localhost:3000/api/auth/login',
    );
    expect(buildRefreshUrl(' http://localhost:3000/api/ ')).toBe(
      'http://localhost:3000/api/auth/refresh',
    );
    expect(buildLogoutUrl(' http://localhost:3000/api/ ')).toBe(
      'http://localhost:3000/api/auth/logout',
    );
  });
});

describe('login', () => {
  it('returns a validated session and never persists the password itself', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'signed-token',
          refreshToken: 'opaque-refresh-token',
          user: { id: 'user-1', email: 'user@example.com' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      login('http://localhost:3000/api', {
        email: 'user@example.com',
        password: 'password1234',
      }),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      refreshToken: 'opaque-refresh-token',
      user: { id: 'user-1', email: 'user@example.com' },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('surfaces the structured API message for invalid credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Email or password is incorrect.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(
      login('http://localhost:3000/api', {
        email: 'user@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow('Email or password is incorrect.');
  });

  it('rejects a malformed successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ accessToken: 'missing-user' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(
      login('http://localhost:3000/api', {
        email: 'user@example.com',
        password: 'password1234',
      }),
    ).rejects.toThrow("La risposta dell'API non contiene una sessione valida.");
  });
});

describe('refreshSession', () => {
  it('rotates the stored refresh token through the documented endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'rotated-access-token',
          refreshToken: 'rotated-refresh-token',
          user: { id: 'user-1', email: 'user@example.com' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      refreshSession('http://localhost:3000/api', {
        refreshToken: 'opaque-refresh-token',
      }),
    ).resolves.toEqual({
      accessToken: 'rotated-access-token',
      refreshToken: 'rotated-refresh-token',
      user: { id: 'user-1', email: 'user@example.com' },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'opaque-refresh-token' }),
      }),
    );
  });
});

describe('logout', () => {
  it('revokes the refresh token and accepts the empty success response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      logout('http://localhost:3000/api', {
        refreshToken: 'opaque-refresh-token',
      }),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/logout',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'opaque-refresh-token' }),
      }),
    );
  });
});
