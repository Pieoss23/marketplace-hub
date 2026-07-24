import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AnnouncementResponse } from '@marketplace-hub/contracts';

import {
  AppComponent,
  buildAnnouncementContextUrl,
  filterAnnouncements,
  readAnnouncementIdFromUrl,
} from './app.component';

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

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  afterEach(() => httpTesting.verify());

  it('shows backend status and the empty announcements state', () => {
    flushInitialRequests([]);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Backend operativo');
    expect(text).toContain('Il tuo spazio è ancora vuoto');
  });

  it('shows an error when the backend cannot be reached', () => {
    httpTesting.expectOne('/api/announcements').flush([]);
    httpTesting.expectOne('/api/health').error(new ProgressEvent('network error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Backend non raggiungibile');
  });

  it('highlights the announcement selected from the extension deep link', () => {
    flushInitialRequests([]);
    fixture.destroy();
    history.replaceState({}, '', '/?announcementId=announcement-1');
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    flushInitialRequests([announcement]);
    fixture.detectChanges();

    const linkedCard = fixture.nativeElement.querySelector(
      '#announcement-announcement-1.linked-announcement',
    ) as HTMLElement | null;
    expect(linkedCard).not.toBeNull();
    expect(linkedCard?.textContent).toContain('Annuncio collegato all’estensione Chrome');
    history.replaceState({}, '', '/');
  });

  it('prepares an explicit announcement handoff to the extension', () => {
    flushInitialRequests([announcement]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.extension-action') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(new URL(window.location.href).searchParams.get('announcementId')).toBe(announcement.id);
    expect(fixture.nativeElement.textContent).toContain(
      'apri l’estensione Chrome per trovare questo annuncio selezionato',
    );
    history.replaceState({}, '', '/');
  });

  it('creates an announcement from the central form', () => {
    flushInitialRequests([]);
    fixture.detectChanges();
    setInput('input[formControlName="title"]', 'Mechanical keyboard');
    setInput('textarea[formControlName="description"]', 'Used mechanical keyboard');
    setInput('input[formControlName="priceEuros"]', '75');
    setInput('input[formControlName="categoryCode"]', 'electronics');
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );

    const request = httpTesting.expectOne('/api/announcements');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      title: 'Mechanical keyboard',
      description: 'Used mechanical keyboard',
      priceAmount: 7500,
      currency: 'EUR',
      categoryCode: 'electronics',
      condition: 'USED_GOOD',
      quantity: 1,
    });
    request.flush(announcement);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Mechanical keyboard');
  });

  it('blocks prices that are not positive before contacting the API', () => {
    flushInitialRequests([]);
    fixture.detectChanges();
    setInput('input[formControlName="title"]', 'Mechanical keyboard');
    setInput('textarea[formControlName="description"]', 'Used mechanical keyboard');
    setInput('input[formControlName="priceEuros"]', '0');
    setInput('input[formControlName="categoryCode"]', 'electronics');

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    httpTesting.expectNone('/api/announcements');
    expect(fixture.nativeElement.textContent).toContain(
      'Inserisci un prezzo maggiore di zero.',
    );
  });

  it('keeps the V1 currency fixed to EUR', () => {
    flushInitialRequests([]);
    fixture.detectChanges();

    const currencyInput = fixture.nativeElement.querySelector(
      'input[formControlName="currency"]',
    ) as HTMLInputElement;

    expect(currencyInput.value).toBe('EUR');
    expect(currencyInput.readOnly).toBeTrue();
  });

  it('accepts descriptions within the API limit of 5,000 characters', () => {
    flushInitialRequests([]);
    fixture.detectChanges();
    const description = 'a'.repeat(4500);
    setInput('input[formControlName="title"]', 'Mechanical keyboard');
    setInput('textarea[formControlName="description"]', description);
    setInput('input[formControlName="priceEuros"]', '75');
    setInput('input[formControlName="categoryCode"]', 'electronics');

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );

    const request = httpTesting.expectOne('/api/announcements');
    expect(request.request.body.description).toBe(description);
    request.flush(announcement);
  });

  it('edits an existing announcement through the central form', () => {
    flushInitialRequests([announcement]);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.edit-action') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Modifica inserzione');
    setInput('input[formControlName="title"]', 'Updated keyboard');
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );

    const request = httpTesting.expectOne('/api/announcements/announcement-1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      title: 'Updated keyboard',
      description: announcement.description,
      priceAmount: announcement.price,
      currency: announcement.currency,
      categoryCode: announcement.categoryCode,
      condition: announcement.condition,
      quantity: announcement.quantity,
    });
    request.flush({ ...announcement, title: 'Updated keyboard' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Updated keyboard');
    expect(fixture.nativeElement.textContent).toContain('Crea una nuova inserzione');
  });

  it('requires explicit confirmation before deleting an announcement', () => {
    flushInitialRequests([announcement]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Mechanical keyboard');

    (fixture.nativeElement.querySelector('.delete-action') as HTMLButtonElement).click();
    fixture.detectChanges();

    httpTesting.expectNone('/api/announcements/announcement-1');
    expect(fixture.nativeElement.textContent).toContain('Eliminare definitivamente?');

    (fixture.nativeElement.querySelector('.confirm-delete-action') as HTMLButtonElement).click();
    const request = httpTesting.expectOne('/api/announcements/announcement-1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Mechanical keyboard');
    expect(fixture.nativeElement.textContent).toContain('Il tuo spazio è ancora vuoto');
  });

  it('cancels deletion without contacting the API', () => {
    flushInitialRequests([announcement]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.delete-action') as HTMLButtonElement).click();
    fixture.detectChanges();
    const confirmationButtons = fixture.nativeElement.querySelectorAll(
      '.delete-confirmation button',
    ) as NodeListOf<HTMLButtonElement>;
    confirmationButtons[0]?.click();
    fixture.detectChanges();

    httpTesting.expectNone('/api/announcements/announcement-1');
    expect(fixture.nativeElement.textContent).toContain('Mechanical keyboard');
    expect(fixture.nativeElement.textContent).not.toContain('Eliminare definitivamente?');
  });

  it('filters announcements by text and status without additional API calls', () => {
    const publishedAnnouncement = {
      ...announcement,
      id: 'announcement-2',
      title: 'Vintage mouse',
      description: 'Collector mouse',
      status: 'PUBLISHED' as const,
    };
    flushInitialRequests([announcement, publishedAnnouncement]);
    fixture.detectChanges();

    setInput('.announcement-filters input[type="search"]', 'vintage');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Vintage mouse');
    expect(fixture.nativeElement.textContent).not.toContain('Mechanical keyboard');
    expect(fixture.nativeElement.textContent).toContain('1 di 2 visibili');

    const statusSelect = fixture.nativeElement.querySelector(
      '.announcement-filters select',
    ) as HTMLSelectElement;
    statusSelect.value = 'READY';
    statusSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nessun annuncio corrisponde ai filtri');
    httpTesting.expectNone('/api/announcements');
  });

  it('applies the status selected from the dashboard summary', () => {
    const publishedAnnouncement = {
      ...announcement,
      id: 'announcement-2',
      title: 'Vintage mouse',
      status: 'PUBLISHED' as const,
    };
    flushInitialRequests([announcement, publishedAnnouncement]);
    fixture.detectChanges();

    const summaryButtons = fixture.nativeElement.querySelectorAll(
      'app-announcement-summary button',
    ) as NodeListOf<HTMLButtonElement>;
    summaryButtons[4]?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Vintage mouse');
    expect(fixture.nativeElement.textContent).not.toContain('Mechanical keyboard');
    expect(fixture.nativeElement.textContent).toContain('1 di 2 visibili');
  });

  it('exits edit mode when the announcement being edited is deleted', () => {
    flushInitialRequests([announcement]);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.edit-action') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Modifica inserzione');

    (fixture.nativeElement.querySelector('.delete-action') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.confirm-delete-action') as HTMLButtonElement).click();
    httpTesting.expectOne('/api/announcements/announcement-1').flush(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Crea una nuova inserzione');
  });

  it('shows an error and keeps the announcement when delete fails', () => {
    flushInitialRequests([announcement]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.delete-action') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.confirm-delete-action') as HTMLButtonElement).click();
    httpTesting
      .expectOne('/api/announcements/announcement-1')
      .flush({ message: 'Boom' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mechanical keyboard');
    expect(fixture.nativeElement.textContent).toContain('Controlla questi dettagli');
    expect(fixture.nativeElement.textContent).not.toContain('Eliminare definitivamente?');
  });

  it('validates and publishes the mock channel, rendering issues and history', () => {
    flushInitialRequests([announcement]);
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector('.channel-actions .text-action') as HTMLButtonElement
    ).click();
    const validateRequest = httpTesting.expectOne(
      '/api/announcements/announcement-1/channels/mock/validate',
    );
    validateRequest.flush({
      valid: false,
      issues: [
        {
          code: 'mock.title.too_long',
          message: 'Title too long',
          field: 'title',
          severity: 'ERROR',
          connectorCode: 'mock',
        },
      ],
      validatedAt: '2026-07-12T09:00:00.000Z',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Title too long');

    (fixture.nativeElement.querySelector('.publish-action') as HTMLButtonElement).click();
    const publishRequest = httpTesting.expectOne(
      '/api/announcements/announcement-1/channels/mock/publish',
    );
    publishRequest.flush({
      publicationId: 'publication-1',
      status: 'PUBLISHED',
      connectorCode: 'mock',
      externalListingId: 'mock-external-1',
      externalUrl: 'http://mock-marketplace.local/listing/mock-external-1',
      publishedAt: '2026-07-12T09:01:00.000Z',
    });
    httpTesting.expectOne('/api/announcements/announcement-1').flush({
      ...announcement,
      status: 'PUBLISHED',
      channels: [
        {
          connectorCode: 'mock',
          enabled: true,
          status: 'PUBLISHED',
          externalListingId: 'mock-external-1',
          externalUrl: 'http://mock-marketplace.local/listing/mock-external-1',
          publishedAt: '2026-07-12T09:01:00.000Z',
        },
      ],
    });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('mock-external-1');
    expect(text).toContain('Pubblicato');

    const publishButton = fixture.nativeElement.querySelector(
      '.publish-action',
    ) as HTMLButtonElement;
    expect(publishButton.disabled).toBe(true);
  });

  it('shows the failure reason and lets the user retry a failed publication', () => {
    flushInitialRequests([announcement]);
    fixture.detectChanges();

    const publishButton = fixture.nativeElement.querySelector(
      '.publish-action',
    ) as HTMLButtonElement;
    publishButton.click();
    httpTesting.expectOne('/api/announcements/announcement-1/channels/mock/publish').flush({
      publicationId: 'publication-1',
      status: 'FAILED',
      connectorCode: 'mock',
      lastError: 'marketplace unavailable',
    });
    httpTesting.expectOne('/api/announcements/announcement-1').flush({
      ...announcement,
      status: 'READY',
      channels: [
        {
          connectorCode: 'mock',
          enabled: true,
          status: 'FAILED',
          lastError: 'marketplace unavailable',
        },
      ],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('marketplace unavailable');
    expect(publishButton.textContent?.trim()).toBe('Riprova pubblicazione');
    expect(publishButton.disabled).toBe(false);

    publishButton.click();
    const retryRequest = httpTesting.expectOne(
      '/api/announcements/announcement-1/channels/mock/publish',
    );
    retryRequest.flush({
      publicationId: 'publication-2',
      status: 'PUBLISHED',
      connectorCode: 'mock',
      externalListingId: 'mock-external-2',
      publishedAt: '2026-07-12T09:05:00.000Z',
    });
    httpTesting.expectOne('/api/announcements/announcement-1').flush({
      ...announcement,
      status: 'PUBLISHED',
      channels: [
        {
          connectorCode: 'mock',
          enabled: true,
          status: 'PUBLISHED',
          externalListingId: 'mock-external-2',
        },
      ],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('mock-external-2');
  });

  it('shows the failure reason for a past attempt in the publication history', () => {
    flushInitialRequests([announcement]);
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector('.history-heading .text-action') as HTMLButtonElement
    ).click();
    httpTesting.expectOne('/api/announcements/announcement-1/publications').flush([
      {
        publicationId: 'publication-1',
        status: 'FAILED',
        connectorCode: 'mock',
        lastError: 'marketplace unavailable',
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('marketplace unavailable');
  });

  function flushInitialRequests(announcements: readonly (typeof announcement)[]): void {
    httpTesting.expectOne('/api/health').flush({
      status: 'ok',
      service: 'marketplace-hub-api',
      timestamp: '2026-07-12T08:00:00.000Z',
    });
    httpTesting.expectOne('/api/announcements').flush(announcements);
  }

  function setInput(selector: string, value: string): void {
    const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }
});

describe('readAnnouncementIdFromUrl', () => {
  it('reads and decodes the extension deep-link parameter', () => {
    expect(
      readAnnouncementIdFromUrl('http://localhost:4200/?announcementId=id%20with%20spaces'),
    ).toBe('id with spaces');
  });

  it('ignores a missing or blank announcement id', () => {
    expect(readAnnouncementIdFromUrl('http://localhost:4200/')).toBeNull();
    expect(readAnnouncementIdFromUrl('http://localhost:4200/?announcementId=%20')).toBeNull();
  });
});

describe('buildAnnouncementContextUrl', () => {
  it('preserves existing query parameters and encodes the selected announcement', () => {
    expect(
      buildAnnouncementContextUrl('http://localhost:4200/?mode=compact', 'id with spaces'),
    ).toBe('http://localhost:4200/?mode=compact&announcementId=id+with+spaces');
  });
});

describe('filterAnnouncements', () => {
  it('combines normalized text search and status filtering', () => {
    const publishedAnnouncement = {
      ...announcement,
      id: 'announcement-2',
      title: 'Vintage mouse',
      status: 'PUBLISHED' as const,
    };

    expect(
      filterAnnouncements([announcement, publishedAnnouncement], 'VINTAGE', 'PUBLISHED'),
    ).toEqual([publishedAnnouncement]);
    expect(filterAnnouncements([announcement], 'electronics', 'ALL')).toEqual([announcement]);
    expect(filterAnnouncements([announcement], '', 'PUBLISHED')).toEqual([]);
  });
});
