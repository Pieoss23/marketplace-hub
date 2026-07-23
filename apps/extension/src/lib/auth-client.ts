import type { AuthResponse, LoginRequest } from '@marketplace-hub/contracts';

import { ApiRequestError } from './api-client';

export function buildLoginUrl(apiBaseUrl: string): string {
  const normalizedBaseUrl = apiBaseUrl.trim().replace(/\/+$/, '');
  if (normalizedBaseUrl.length === 0) {
    throw new Error("L'URL API non può essere vuoto.");
  }
  return `${normalizedBaseUrl}/auth/login`;
}

export async function login(
  apiBaseUrl: string,
  request: LoginRequest,
): Promise<AuthResponse> {
  const response = await fetch(buildLoginUrl(apiBaseUrl), {
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

function extractApiMessage(payload: unknown, status: number): string {
  if (typeof payload === 'object' && payload !== null) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return `Accesso non riuscito (HTTP ${status}).`;
}
