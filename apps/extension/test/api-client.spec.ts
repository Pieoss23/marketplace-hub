import type { AnnouncementResponse } from '@marketplace-hub/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildAnnouncementsUrl, fetchAnnouncements } from '../src/lib/api-client';

const announcement: AnnouncementResponse = {
  id: 'announcement-1',
  title: 'Mechanical keyboard',
  description: 'Used mechanical keyboard in good condition.',
  price: 7500,
  currency: 'EUR',
  categoryCode: 'electronics',
  condition: 'USED_GOOD',
  quantity: 1,
  status: 'READY',
  channels: [],
  createdAt: '2026-07-12T08:00:00.000Z',
  updatedAt: '2026-07-12T08:00:00.000Z',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildAnnouncementsUrl', () => {
  it('normalizes whitespace and trailing slashes', () => {
    expect(buildAnnouncementsUrl('  http://localhost:3000/api///  ')).toBe(
      'http://localhost:3000/api/announcements',
    );
  });

  it('rejects an empty API URL', () => {
    expect(() => buildAnnouncementsUrl('   ')).toThrow("L'URL API non può essere vuoto.");
  });
});

describe('fetchAnnouncements', () => {
  it('returns a valid announcement list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([announcement]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAnnouncements('http://localhost:3000/api/', 'access-token')).resolves.toEqual([
      announcement,
    ]);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/announcements', {
      headers: { Authorization: 'Bearer access-token' },
    });
  });

  it('reports a non-successful HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(fetchAnnouncements('http://localhost:3000/api', 'access-token')).rejects.toThrow(
      'Impossibile leggere gli annunci (HTTP 503).',
    );
  });

  it('reports invalid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('not-json', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(fetchAnnouncements('http://localhost:3000/api', 'access-token')).rejects.toThrow(
      "La risposta dell'API non contiene JSON valido.",
    );
  });

  it('rejects an unexpected payload instead of trusting a TypeScript cast', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ id: 'incomplete' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(fetchAnnouncements('http://localhost:3000/api', 'access-token')).rejects.toThrow(
      "La risposta dell'API non contiene un elenco di annunci valido.",
    );
  });
});
