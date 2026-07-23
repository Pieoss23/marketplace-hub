import type { AnnouncementResponse } from '@marketplace-hub/contracts';
import { describe, expect, it } from 'vitest';

import { buildSummary, formatPriceEuros } from '../src/lib/format';

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

describe('formatPriceEuros', () => {
  it('converts cents to a localized currency string', () => {
    expect(formatPriceEuros(7500, 'EUR')).toBe('75,00 €');
  });

  it('handles zero and fractional cents correctly', () => {
    expect(formatPriceEuros(0, 'EUR')).toBe('0,00 €');
    expect(formatPriceEuros(1, 'EUR')).toBe('0,01 €');
  });
});

describe('buildSummary', () => {
  it('includes title, description and all formatted fields', () => {
    const summary = buildSummary(announcement);
    expect(summary).toContain('Mechanical keyboard');
    expect(summary).toContain('Used mechanical keyboard in good condition.');
    expect(summary).toContain('75,00 €');
    expect(summary).toContain('Categoria: electronics');
    expect(summary).toContain('Condizione: USED_GOOD');
    expect(summary).toContain('Quantità: 1');
  });
});
