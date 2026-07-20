import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PublicationsService } from './publications.service';

describe('PublicationsService', () => {
  let service: PublicationsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PublicationsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('publishes through the mock endpoint', () => {
    service.publishMock('listing-1', { category: 'electronics' }).subscribe();

    const request = httpTesting.expectOne('/api/listings/listing-1/publications/mock');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ category: 'electronics' });
    request.flush({});
  });

  it('loads independent publication attempts', () => {
    service.findByListingId('listing-1').subscribe();

    const request = httpTesting.expectOne('/api/listings/listing-1/publications');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});
