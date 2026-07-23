import type { AuthResponse } from '@marketplace-hub/contracts';

export const DEFAULT_API_BASE_URL = 'http://localhost:3000/api';
export const DEFAULT_WEB_APP_BASE_URL = 'http://localhost:4200';

const API_BASE_URL_STORAGE_KEY = 'apiBaseUrl';
const WEB_APP_BASE_URL_STORAGE_KEY = 'webAppBaseUrl';
const AUTH_SESSION_STORAGE_KEY = 'authSession';

async function getStoredUrl(storageKey: string, fallback: string): Promise<string> {
  const stored = await chrome.storage.local.get(storageKey);
  const value = stored[storageKey];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

export async function getApiBaseUrl(): Promise<string> {
  return getStoredUrl(API_BASE_URL_STORAGE_KEY, DEFAULT_API_BASE_URL);
}

export async function setApiBaseUrl(url: string): Promise<void> {
  await chrome.storage.local.set({ [API_BASE_URL_STORAGE_KEY]: url.trim() });
}

export async function getWebAppBaseUrl(): Promise<string> {
  return getStoredUrl(WEB_APP_BASE_URL_STORAGE_KEY, DEFAULT_WEB_APP_BASE_URL);
}

export async function setWebAppBaseUrl(url: string): Promise<void> {
  await chrome.storage.local.set({ [WEB_APP_BASE_URL_STORAGE_KEY]: url.trim() });
}

export async function getAuthSession(): Promise<AuthResponse | null> {
  const stored = await chrome.storage.local.get(AUTH_SESSION_STORAGE_KEY);
  const value = stored[AUTH_SESSION_STORAGE_KEY];
  return isAuthResponse(value) ? value : null;
}

export async function setAuthSession(session: AuthResponse): Promise<void> {
  await chrome.storage.local.set({ [AUTH_SESSION_STORAGE_KEY]: session });
}

export async function clearAuthSession(): Promise<void> {
  await chrome.storage.local.remove(AUTH_SESSION_STORAGE_KEY);
}

function isAuthResponse(value: unknown): value is AuthResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { accessToken?: unknown; user?: unknown };
  if (
    typeof candidate.accessToken !== 'string' ||
    candidate.accessToken.length === 0 ||
    typeof candidate.user !== 'object' ||
    candidate.user === null
  ) {
    return false;
  }
  const user = candidate.user as { id?: unknown; email?: unknown };
  return typeof user.id === 'string' && typeof user.email === 'string';
}
