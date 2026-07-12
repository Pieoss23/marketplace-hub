import type { Announcement } from '@marketplace-hub/domain';
import { MockChannelConnector } from './mock-channel.connector';

function buildAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: 'announcement-1',
    title: 'Tastiera meccanica',
    description: 'Usata, in buone condizioni, tastiera meccanica vintage.',
    price: 15000,
    currency: 'EUR',
    categoryCode: 'electronics',
    condition: 'USED_GOOD',
    quantity: 1,
    status: 'READY',
    createdAt: new Date('2026-07-12T09:00:00.000Z'),
    updatedAt: new Date('2026-07-12T09:00:00.000Z'),
    ...overrides,
  };
}

describe('MockChannelConnector', () => {
  it('rejects a title longer than 80 characters', () => {
    const connector = new MockChannelConnector();
    const issues = connector.validate(buildAnnouncement({ title: 'a'.repeat(81) }), {});

    expect(issues).toEqual([
      expect.objectContaining({
        code: 'mock.title.too_long',
        field: 'title',
        severity: 'ERROR',
        connectorCode: 'mock',
      }),
    ]);
  });

  it('rejects a description shorter than 20 characters', () => {
    const connector = new MockChannelConnector();
    const issues = connector.validate(buildAnnouncement({ description: 'too short' }), {});

    expect(issues).toEqual([
      expect.objectContaining({
        code: 'mock.description.too_short',
        field: 'description',
        severity: 'ERROR',
      }),
    ]);
  });

  it('accepts a valid announcement', () => {
    const connector = new MockChannelConnector();
    expect(connector.validate(buildAnnouncement(), {})).toEqual([]);
  });

  it('maps the announcement and channel configuration into a payload', () => {
    const connector = new MockChannelConnector();
    const payload = connector.map(buildAnnouncement(), { category: 'vintage_keyboards' });

    expect(payload).toEqual({
      connectorCode: 'mock',
      title: 'Tastiera meccanica',
      description: 'Usata, in buone condizioni, tastiera meccanica vintage.',
      price: { amount: 15000, currency: 'EUR' },
      categoryCode: 'electronics',
      condition: 'USED_GOOD',
      quantity: 1,
      configuration: { category: 'vintage_keyboards' },
    });
  });

  it('publishes without external calls, returning a deterministic mock id', async () => {
    const connector = new MockChannelConnector(() => 'fixed-id');
    const result = await connector.publish(connector.map(buildAnnouncement(), {}));

    expect(result).toEqual({
      externalListingId: 'mock_fixed-id',
      externalUrl: 'https://mock.marketplace.local/listings/fixed-id',
    });
  });
});
