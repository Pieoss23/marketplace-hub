import type {
  AuthResponse,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
} from '@marketplace-hub/contracts';

import { ApiRequestError } from './api-client';

export function buildLoginUrl(apiBaseUrl: string): string {
  return buildAuthUrl(apiBaseUrl, 'login');
}

export function buildRefreshUrl(apiBaseUrl: string): string {
  return buildAuthUrl(apiBaseUrl, 'refresh');
}

export function buildLogoutUrl(apiBaseUrl: string): string {
  return buildAuthUrl(apiBaseUrl, 'logout');
}

function buildAuthUrl(apiBaseUrl: string, action: 'login' | 'refresh' | 'logout'): string {
  const normalizedBaseUrl = apiBaseUrl.trim().replace(/\/+$/, '');
  if (normalizedBaseUrl.length === 0) {
    throw new Error("L'URL API non può essere vuoto.");
  }
  return `${normalizedBaseUrl}/auth/${action}`;
}

export async function login(apiBaseUrl: string, request: LoginRequest): Promise<AuthResponse> {
  return requestAuthSession(buildLoginUrl(apiBaseUrl), request);
}

export async function refreshSession(
  apiBaseUrl: string,
  request: RefreshRequest,
): Promise<AuthResponse> {
  return requestAuthSession(buildRefreshUrl(apiBaseUrl), request);
}

export async function logout(apiBaseUrl: string, request: LogoutRequest): Promise<void> {
  const response = await fetch(buildLogoutUrl(apiBaseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (response.ok) {
    return;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiRequestError("La risposta dell'API non contiene JSON valido.", response.status);
  }

  throw new ApiRequestError(extractApiMessage(payload, response.status), response.status);
}

async function requestAuthSession(
  url: string,
  request: LoginRequest | RefreshRequest,
): Promise<AuthResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiRequestError("La risposta dell'API non contiene JSON valido.", response.status);
  }

  if (!response.ok) {
    throw new ApiRequestError(extractApiMessage(payload, response.status), response.status);
  }
  if (!isAuthResponse(payload)) {
    throw new Error("La risposta dell'API non contiene una sessione valida.");
  }
  return payload;
}

function isAuthResponse(value: unknown): value is AuthResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as {
    accessToken?: unknown;
    refreshToken?: unknown;
    user?: unknown;
  };
  if (
    typeof candidate.accessToken !== 'string' ||
    candidate.accessToken.length === 0 ||
    typeof candidate.refreshToken !== 'string' ||
    candidate.refreshToken.length === 0 ||
    typeof candidate.user !== 'object' ||
    candidate.user === null
  ) {
    return false;
  }
  const user = candidate.user as { id?: unknown; email?: unknown };
  return typeof user.id === 'string' && typeof user.email === 'string';
}

function extractApiMessage(payload: unknown, status: number): string {
  if (typeof payload === 'object' && payload !== null) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return `Accesso non riuscito (HTTP ${status}).`;
}
