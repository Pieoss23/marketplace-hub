import type { AnnouncementResponse } from '@marketplace-hub/contracts';

import { formatPriceEuros } from './format';

export const FILL_DEMO_FORM_MESSAGE = 'FILL_DEMO_FORM' as const;

export interface FillDemoFormMessage {
  readonly type: typeof FILL_DEMO_FORM_MESSAGE;
  readonly priceAmount: number;
  readonly fields: {
    readonly title: string;
    readonly description: string;
    readonly price: string;
  };
}

export type FillField = keyof FillDemoFormMessage['fields'];

export interface FillDemoFormResult {
  readonly applied: boolean;
  readonly matchedFields: readonly FillField[];
}

export function buildFillMessage(announcement: AnnouncementResponse): FillDemoFormMessage {
  return {
    type: FILL_DEMO_FORM_MESSAGE,
    priceAmount: announcement.price,
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

  const candidate = value as { type?: unknown; priceAmount?: unknown; fields?: unknown };
  if (
    candidate.type !== FILL_DEMO_FORM_MESSAGE ||
    typeof candidate.priceAmount !== 'number' ||
    !Number.isInteger(candidate.priceAmount) ||
    candidate.priceAmount < 0 ||
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
export function applyFillToDocument(
  doc: Document,
  message: FillDemoFormMessage,
): FillDemoFormResult {
  const fields = detectDemoFormFields(doc);
  const matchedFields = FILL_FIELDS.filter((field) => fields[field] !== undefined);

  if (matchedFields.length !== FILL_FIELDS.length) {
    return { applied: false, matchedFields };
  }

  for (const field of FILL_FIELDS) {
    const input = fields[field];
    if (!input) {
      return { applied: false, matchedFields };
    }
    input.value =
      field === 'price' && input instanceof HTMLInputElement && input.type === 'number'
        ? (message.priceAmount / 100).toString()
        : message.fields[field];
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  return { applied: true, matchedFields };
}

export type FillDemoFormResponse = FillDemoFormResult;

export function handleFillDemoFormMessage(
  doc: Document,
  message: unknown,
  sendResponse: (response: FillDemoFormResponse) => void,
): boolean {
  if (!isFillDemoFormMessage(message)) {
    return false;
  }

  sendResponse(applyFillToDocument(doc, message));
  return true;
}

type FillControl = HTMLInputElement | HTMLTextAreaElement;

const FILL_FIELDS: readonly FillField[] = ['title', 'description', 'price'];

const FIELD_KEYWORDS: Readonly<Record<FillField, readonly string[]>> = {
  title: ['titolo', 'title', 'oggetto', 'nome annuncio'],
  description: ['descrizione', 'description', 'dettagli', 'testo annuncio'],
  price: ['prezzo', 'price', 'costo', 'importo'],
};

export function detectDemoFormFields(
  doc: Document,
): Readonly<Partial<Record<FillField, FillControl>>> {
  const controls = Array.from(doc.querySelectorAll<FillControl>('input, textarea')).filter(
    isFillableControl,
  );
  const rankedMatches = FILL_FIELDS.flatMap((field) =>
    controls
      .map((control) => ({ field, control, score: scoreControl(control, field) }))
      .filter(({ score }) => score > 0),
  ).sort((left, right) => right.score - left.score);

  const detected: Partial<Record<FillField, FillControl>> = {};
  const usedControls = new Set<FillControl>();
  for (const match of rankedMatches) {
    if (detected[match.field] || usedControls.has(match.control)) {
      continue;
    }
    detected[match.field] = match.control;
    usedControls.add(match.control);
  }
  return detected;
}

function isFillableControl(control: FillControl): boolean {
  if (control instanceof HTMLTextAreaElement) {
    return !control.disabled && !control.readOnly;
  }
  return (
    !control.disabled &&
    !control.readOnly &&
    !['button', 'checkbox', 'email', 'file', 'hidden', 'password', 'radio', 'submit'].includes(
      control.type,
    )
  );
}

function scoreControl(control: FillControl, field: FillField): number {
  const descriptor = normalizeDescriptor([
    control.id,
    control.getAttribute('name'),
    control.getAttribute('placeholder'),
    control.getAttribute('aria-label'),
    ...Array.from(control.labels ?? []).map((label) => label.textContent),
  ]);
  const keywordScore = FIELD_KEYWORDS[field].reduce(
    (score, keyword) => score + (descriptor.includes(keyword) ? 10 : 0),
    0,
  );
  if (keywordScore === 0) {
    return 0;
  }

  if (field === 'description' && control instanceof HTMLTextAreaElement) {
    return keywordScore + 4;
  }
  if (field === 'price' && control instanceof HTMLInputElement && control.type === 'number') {
    return keywordScore + 3;
  }
  return keywordScore;
}

function normalizeDescriptor(values: readonly (string | null)[]): string {
  return values
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('it');
}
