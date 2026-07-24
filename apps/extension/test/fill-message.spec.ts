import type { AnnouncementResponse } from '@marketplace-hub/contracts';
import { describe, expect, it } from 'vitest';

import {
  FILL_DEMO_FORM_MESSAGE,
  applyFillToDocument,
  buildFillMessage,
  detectDemoFormFields,
  handleFillDemoFormMessage,
  isFillDemoFormMessage,
} from '../src/lib/fill-message';

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

describe('buildFillMessage', () => {
  it('maps an announcement to the popup -> content-script message shape', () => {
    const message = buildFillMessage(announcement);
    expect(message).toEqual({
      type: FILL_DEMO_FORM_MESSAGE,
      priceAmount: 7500,
      fields: {
        title: 'Mechanical keyboard',
        description: 'Used mechanical keyboard in good condition.',
        price: '75,00 €',
      },
    });
  });
});

describe('isFillDemoFormMessage', () => {
  it('accepts a well-formed message', () => {
    expect(isFillDemoFormMessage(buildFillMessage(announcement))).toBe(true);
  });

  it('rejects unrelated messages', () => {
    expect(isFillDemoFormMessage({ type: 'SOMETHING_ELSE' })).toBe(false);
    expect(isFillDemoFormMessage(null)).toBe(false);
    expect(isFillDemoFormMessage('FILL_DEMO_FORM')).toBe(false);
  });

  it('rejects messages with missing or malformed fields', () => {
    expect(isFillDemoFormMessage({ type: FILL_DEMO_FORM_MESSAGE })).toBe(false);
    expect(
      isFillDemoFormMessage({
        type: FILL_DEMO_FORM_MESSAGE,
        priceAmount: 7500,
        fields: null,
      }),
    ).toBe(false);
    expect(
      isFillDemoFormMessage({
        type: FILL_DEMO_FORM_MESSAGE,
        priceAmount: 7500,
        fields: {
          title: 'Mechanical keyboard',
          description: 'Used mechanical keyboard in good condition.',
          price: 7500,
        },
      }),
    ).toBe(false);
  });
});

describe('applyFillToDocument', () => {
  function buildDemoDocument(): Document {
    document.body.innerHTML = `
      <form>
        <input id="demo-title" />
        <textarea id="demo-description"></textarea>
        <input id="demo-price" />
      </form>
    `;
    return document;
  }

  it('fills the known demo form fields and returns true', () => {
    const doc = buildDemoDocument();
    const message = buildFillMessage(announcement);

    const applied = applyFillToDocument(doc, message);

    expect(applied).toEqual({
      applied: true,
      matchedFields: ['title', 'description', 'price'],
    });
    expect((doc.querySelector('#demo-title') as HTMLInputElement).value).toBe('Mechanical keyboard');
    expect((doc.querySelector('#demo-description') as HTMLTextAreaElement).value).toBe(
      'Used mechanical keyboard in good condition.',
    );
    expect((doc.querySelector('#demo-price') as HTMLInputElement).value).toBe('75,00 €');
  });

  it('returns false without throwing when the demo form is not present', () => {
    document.body.innerHTML = '<p>Not the demo page</p>';
    const message = buildFillMessage(announcement);

    expect(applyFillToDocument(document, message)).toEqual({
      applied: false,
      matchedFields: [],
    });
  });

  it('recognizes reordered fields from semantic labels without known ids', () => {
    document.body.innerHTML = `
      <form>
        <label>Costo richiesto <input name="listing-amount" type="number" /></label>
        <label>Testo annuncio <textarea name="body-copy"></textarea></label>
        <label>Oggetto <input name="headline" /></label>
        <label>Email <input name="contact" type="email" /></label>
      </form>
    `;

    const result = applyFillToDocument(document, buildFillMessage(announcement));

    expect(result).toEqual({
      applied: true,
      matchedFields: ['title', 'description', 'price'],
    });
    expect((document.querySelector('[name="headline"]') as HTMLInputElement).value).toBe(
      announcement.title,
    );
    expect((document.querySelector('[name="body-copy"]') as HTMLTextAreaElement).value).toBe(
      announcement.description,
    );
    expect((document.querySelector('[name="listing-amount"]') as HTMLInputElement).value).toBe(
      '75',
    );
  });

  it('does not partially fill when a required semantic field is missing', () => {
    document.body.innerHTML = `
      <form>
        <label>Titolo <input name="headline" value="Existing title" /></label>
        <label>Prezzo <input name="amount" value="10" /></label>
      </form>
    `;

    const result = applyFillToDocument(document, buildFillMessage(announcement));

    expect(result).toEqual({
      applied: false,
      matchedFields: ['title', 'price'],
    });
    expect((document.querySelector('[name="headline"]') as HTMLInputElement).value).toBe(
      'Existing title',
    );
    expect((document.querySelector('[name="amount"]') as HTMLInputElement).value).toBe('10');
  });
});

describe('detectDemoFormFields', () => {
  it('ignores disabled, readonly and credential controls', () => {
    document.body.innerHTML = `
      <label>Titolo <input name="title" readonly /></label>
      <label>Descrizione <textarea name="description"></textarea></label>
      <label>Prezzo <input name="price" disabled /></label>
      <label>Password titolo <input name="password-title" type="password" /></label>
    `;

    const detected = detectDemoFormFields(document);

    expect(detected.title).toBeUndefined();
    expect(detected.description).toBeInstanceOf(HTMLTextAreaElement);
    expect(detected.price).toBeUndefined();
  });
});

describe('handleFillDemoFormMessage', () => {
  function buildDemoDocument(): Document {
    document.body.innerHTML = `
      <form>
        <input id="demo-title" />
        <textarea id="demo-description"></textarea>
        <input id="demo-price" />
      </form>
    `;
    return document;
  }

  it('applies a valid message and responds with applied true', () => {
    const doc = buildDemoDocument();
    const responses: unknown[] = [];

    const handled = handleFillDemoFormMessage(doc, buildFillMessage(announcement), (response) => {
      responses.push(response);
    });

    expect(handled).toBe(true);
    expect(responses).toEqual([
      { applied: true, matchedFields: ['title', 'description', 'price'] },
    ]);
    expect((doc.querySelector('#demo-title') as HTMLInputElement).value).toBe(
      'Mechanical keyboard',
    );
  });

  it('responds with applied false when the demo form is not present', () => {
    document.body.innerHTML = '<p>Not the demo page</p>';
    const responses: unknown[] = [];

    const handled = handleFillDemoFormMessage(
      document,
      buildFillMessage(announcement),
      (response) => {
        responses.push(response);
      },
    );

    expect(handled).toBe(true);
    expect(responses).toEqual([{ applied: false, matchedFields: [] }]);
  });

  it('ignores malformed messages without changing the DOM or responding', () => {
    const doc = buildDemoDocument();
    const titleInput = doc.querySelector<HTMLInputElement>('#demo-title')!;
    titleInput.value = 'Existing value';
    const responses: unknown[] = [];

    const handled = handleFillDemoFormMessage(
      doc,
      {
        type: FILL_DEMO_FORM_MESSAGE,
        priceAmount: 7500,
        fields: {
          title: 'Replacement',
          description: 'Description',
        },
      },
      (response) => {
        responses.push(response);
      },
    );

    expect(handled).toBe(false);
    expect(responses).toEqual([]);
    expect(titleInput.value).toBe('Existing value');
  });
});
