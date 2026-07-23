import type { AnnouncementResponse } from '@marketplace-hub/contracts';

const NON_BREAKING_SPACE = String.fromCharCode(0xa0);

export function formatPriceEuros(priceCents: number, currency: string): string {
  const euros = priceCents / 100;
  const formatted = new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(euros);
  // Intl inserts a non-breaking space (U+00A0) before the currency symbol; normalize it to a
  // regular space so pasted text into a real form field doesn't carry an invisible character.
  return formatted.split(NON_BREAKING_SPACE).join(' ');
}

export function buildSummary(announcement: AnnouncementResponse): string {
  return [
    announcement.title,
    '',
    announcement.description,
    '',
    `Prezzo: ${formatPriceEuros(announcement.price, announcement.currency)}`,
    `Categoria: ${announcement.categoryCode}`,
    `Condizione: ${announcement.condition}`,
    `Quantità: ${announcement.quantity}`,
  ].join('\n');
}
