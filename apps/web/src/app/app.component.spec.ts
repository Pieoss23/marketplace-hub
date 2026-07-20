import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';

const listing = {
  id: 'listing-1',
  title: 'Mechanical keyboard',
  description: 'Used mechanical keyboard in good condition.',
  price: { amountMinor: 7500, currency: 'EUR' },
  images: [],
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

  it('shows backend status and the empty listing state', () => {
    flushInitialRequests([]);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Backend operativo');
    expect(text).toContain('Il tuo spazio è ancora vuoto');
  });

  it('shows an error when the backend cannot be reached', () => {
    httpTesting.expectOne('/api/listings').flush([]);
    httpTesting.expectOne('/api/health').error(new ProgressEvent('network error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Backend non raggiungibile');
  });

  it('creates a listing from the central form', () => {
    flushInitialRequests([]);
    fixture.detectChanges();
    setInput('input[formControlName="title"]', 'Mechanical keyboard');
    setInput('textarea[formControlName="description"]', 'Used mechanical keyboard');
    setInput('input[formControlName="priceEuros"]', '75');
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );

    const request = httpTesting.expectOne('/api/listings');
    expect(request.request.body).toEqual({
      title: 'Mechanical keyboard',
      description: 'Used mechanical keyboard',
      price: { amountMinor: 7500, currency: 'EUR' },
      images: [],
    });
    request.flush(listing);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Mechanical keyboard');
  });

  it('publishes a listing through mock and renders its state', () => {
    flushInitialRequests([listing]);
    fixture.detectChanges();
    setInput('.compact-field input', 'electronics');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.publish-action') as HTMLButtonElement).click();

    const request = httpTesting.expectOne('/api/listings/listing-1/publications/mock');
    expect(request.request.body).toEqual({ category: 'electronics' });
    request.flush({
      success: true,
      publication: {
        id: 'publication-1',
        listingId: 'listing-1',
        marketplaceId: 'mock',
        status: 'published',
        externalId: 'mock-external-1',
        createdAt: '2026-07-12T09:00:00.000Z',
        updatedAt: '2026-07-12T09:01:00.000Z',
      },
      errors: [],
    });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Pubblicato');
    expect(text).toContain('mock-external-1');
  });

  it('updates a listing from its inline form', () => {
    flushInitialRequests([listing]);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.edit-action') as HTMLButtonElement).click();
    fixture.detectChanges();
    setInput('.edit-form input[formControlName="title"]', 'Updated keyboard');
    setInput('.edit-form input[formControlName="priceEuros"]', '80');
    (fixture.nativeElement.querySelector('.edit-form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );

    const request = httpTesting.expectOne('/api/listings/listing-1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      title: 'Updated keyboard',
      description: listing.description,
      price: { amountMinor: 8000, currency: 'EUR' },
    });
    request.flush({ ...listing, title: 'Updated keyboard', price: { amountMinor: 8000, currency: 'EUR' } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Updated keyboard');
    expect(fixture.nativeElement.querySelector('.edit-form')).toBeNull();
  });

  function flushInitialRequests(listings: readonly (typeof listing)[]): void {
    httpTesting.expectOne('/api/health').flush({
      status: 'ok',
      service: 'marketplace-hub-api',
      timestamp: '2026-07-12T08:00:00.000Z',
    });
    httpTesting.expectOne('/api/listings').flush(listings);
  }

  function setInput(selector: string, value: string): void {
    const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }
});
