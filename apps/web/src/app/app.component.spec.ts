import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';

const announcement = {
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

  it('validates and publishes the mock channel, rendering issues and history', () => {
    flushInitialRequests([announcement]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.channel-actions .text-action') as HTMLButtonElement).click();
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
    httpTesting
      .expectOne('/api/announcements/announcement-1')
      .flush({ ...announcement, status: 'PUBLISHED' });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('mock-external-1');
    expect(text).toContain('Pubblicato');
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
