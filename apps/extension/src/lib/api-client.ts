import type { AnnouncementResponse } from '@marketplace-hub/contracts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAnnouncementResponse(value: unknown): value is AnnouncementResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value['id'] === 'string' &&
    typeof value['title'] === 'string' &&
    typeof value['description'] === 'string' &&
    typeof value['price'] === 'number' &&
    Number.isFinite(value['price']) &&
    typeof value['currency'] === 'string' &&
    typeof value['categoryCode'] === 'string' &&
    typeof value['condition'] === 'string' &&
    typeof value['quantity'] === 'number' &&
    Number.isInteger(value['quantity']) &&
    typeof value['status'] === 'string' &&
    Array.isArray(value['channels']) &&
    typeof value['createdAt'] === 'string' &&
    typeof value['updatedAt'] === 'string'
  );
}

export function buildAnnouncementsUrl(apiBaseUrl: string): string {
  const normalizedBaseUrl = apiBaseUrl.trim().replace(/\/+$/, '');
  if (normalizedBaseUrl.length === 0) {
    throw new Error("L'URL API non può essere vuoto.");
  }
  return `${normalizedBaseUrl}/announcements`;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function fetchAnnouncements(
  apiBaseUrl: string,
  accessToken: string,
): Promise<AnnouncementResponse[]> {
  const response = await fetch(buildAnnouncementsUrl(apiBaseUrl), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new ApiRequestError(
      `Impossibile leggere gli annunci (HTTP ${response.status}).`,
      response.status,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("La risposta dell'API non contiene JSON valido.");
  }

  if (!Array.isArray(payload) || !payload.every(isAnnouncementResponse)) {
    throw new Error("La risposta dell'API non contiene un elenco di annunci valido.");
  }

  return payload;
}
