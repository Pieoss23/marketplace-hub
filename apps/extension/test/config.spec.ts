import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_API_BASE_URL,
  DEFAULT_WEB_APP_BASE_URL,
  clearAuthSession,
  getApiBaseUrl,
  getAuthSession,
  getWebAppBaseUrl,
  setApiBaseUrl,
  setAuthSession,
  setWebAppBaseUrl,
} from '../src/lib/config';

const get = vi.fn();
const set = vi.fn();
const remove = vi.fn();

beforeEach(() => {
  get.mockReset();
  set.mockReset();
  remove.mockReset();
  vi.stubGlobal('chrome', { storage: { local: { get, set, remove } } });
});

describe('extension configuration', () => {
  it('uses product-local defaults when storage is empty', async () => {
    get.mockResolvedValue({});

    await expect(getApiBaseUrl()).resolves.toBe(DEFAULT_API_BASE_URL);
    await expect(getWebAppBaseUrl()).resolves.toBe(DEFAULT_WEB_APP_BASE_URL);
  });

  it('reads and trims independently configured endpoints', async () => {
    get.mockImplementation(async (key: string) =>
      key === 'apiBaseUrl'
        ? { apiBaseUrl: '  http://localhost:3100/api  ' }
        : { webAppBaseUrl: '  http://localhost:4300  ' },
    );

    await expect(getApiBaseUrl()).resolves.toBe('http://localhost:3100/api');
    await expect(getWebAppBaseUrl()).resolves.toBe('http://localhost:4300');
  });

  it('persists API and web app URLs under separate keys', async () => {
    set.mockResolvedValue(undefined);

    await setApiBaseUrl('  http://localhost:3100/api  ');
    await setWebAppBaseUrl('  http://localhost:4200  ');

    expect(set).toHaveBeenNthCalledWith(1, { apiBaseUrl: 'http://localhost:3100/api' });
    expect(set).toHaveBeenNthCalledWith(2, { webAppBaseUrl: 'http://localhost:4200' });
  });

  it('persists and clears a validated extension session without a password', async () => {
    const session = {
      accessToken: 'signed-token',
      user: { id: 'user-1', email: 'user@example.com' },
    };
    get.mockResolvedValue({ authSession: session });
    set.mockResolvedValue(undefined);
    remove.mockResolvedValue(undefined);

    await expect(getAuthSession()).resolves.toEqual(session);
    await setAuthSession(session);
    await clearAuthSession();

    expect(set).toHaveBeenCalledWith({ authSession: session });
    expect(remove).toHaveBeenCalledWith('authSession');
    expect(JSON.stringify(set.mock.calls)).not.toContain('password');
  });

  it('ignores a malformed stored session', async () => {
    get.mockResolvedValue({ authSession: { accessToken: 'token' } });

    await expect(getAuthSession()).resolves.toBeNull();
  });
});
