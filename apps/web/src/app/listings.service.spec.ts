import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ListingsService } from './listings.service';

describe('ListingsService', () => {
  let service: ListingsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ListingsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('loads central listings', () => {
    service.findAll().subscribe((listings) => expect(listings).toEqual([]));
    httpTesting.expectOne('/api/listings').flush([]);
  });

  it('creates a central listing', () => {
    const request = {
      title: 'Mechanical keyboard',
      description: 'Used keyboard',
      price: { amountMinor: 7500, currency: 'EUR' },
      images: [],
    };

    service.create(request).subscribe();

    const httpRequest = httpTesting.expectOne('/api/listings');
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);
    httpRequest.flush({});
  });

  it('updates a central listing', () => {
    const request = { title: 'Updated keyboard' };

    service.update('listing-1', request).subscribe();

    const httpRequest = httpTesting.expectOne('/api/listings/listing-1');
    expect(httpRequest.request.method).toBe('PATCH');
    expect(httpRequest.request.body).toEqual(request);
    httpRequest.flush({});
  });
});
