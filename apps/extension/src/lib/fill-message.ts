import type { AnnouncementResponse } from '@marketplace-hub/contracts';

import { formatPriceEuros } from './format';

export const FILL_DEMO_FORM_MESSAGE = 'FILL_DEMO_FORM' as const;

export interface FillDemoFormMessage {
  readonly type: typeof FILL_DEMO_FORM_MESSAGE;
  readonly fields: {
    readonly title: string;
    readonly description: string;
    readonly price: string;
  };
}

export function buildFillMessage(announcement: AnnouncementResponse): FillDemoFormMessage {
  return {
    type: FILL_DEMO_FORM_MESSAGE,
    fields: {
      title: announcement.title,
      description: announcement.description,
      price: formatPriceEuros(announcement.price, announcement.currency),
    },
  };
}

export function isFillDemoFormMessage(value: unknown): value is FillDemoFormMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as { type?: unknown; fields?: unknown };
  if (
    candidate.type !== FILL_DEMO_FORM_MESSAGE ||
    typeof candidate.fields !== 'object' ||
    candidate.fields === null
  ) {
    return false;
  }

  const fields = candidate.fields as {
    title?: unknown;
    description?: unknown;
    price?: unknown;
  };

  return (
    typeof fields.title === 'string' &&
    typeof fields.description === 'string' &&
    typeof fields.price === 'string'
  );
}

/**
 * Applies a fill message to the demo form page. Pure DOM manipulation, decoupled
 * from chrome.runtime so it can be exercised with jsdom in unit tests without a
 * real extension context.
 */
export function applyFillToDocument(doc: Document, message: FillDemoFormMessage): boolean {
  const titleInput = doc.querySelector<HTMLInputElement>('#demo-title');
  const descriptionInput = doc.querySelector<HTMLTextAreaElement>('#demo-description');
  const priceInput = doc.querySelector<HTMLInputElement>('#demo-price');

  if (!titleInput || !descriptionInput || !priceInput) {
    return false;
  }

  titleInput.value = message.fields.title;
  descriptionInput.value = message.fields.description;
  priceInput.value = message.fields.price;

  for (const input of [titleInput, descriptionInput, priceInput]) {
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  return true;
}

export interface FillDemoFormResponse {
  readonly applied: boolean;
}

export function handleFillDemoFormMessage(
  doc: Document,
  message: unknown,
  sendResponse: (response: FillDemoFormResponse) => void,
): boolean {
  if (!isFillDemoFormMessage(message)) {
    return false;
  }

  sendResponse({ applied: applyFillToDocument(doc, message) });
  return true;
}
