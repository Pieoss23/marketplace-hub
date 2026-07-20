import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { HealthResponse } from '@marketplace-hub/contracts';

import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HealthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('calls the shared health endpoint', () => {
    const response: HealthResponse = {
      status: 'ok',
      service: 'marketplace-hub-api',
      timestamp: '2026-07-10T12:00:00.000Z',
    };

    service.check().subscribe((health) => expect(health).toEqual(response));

    const request = httpTesting.expectOne('/api/health');
    expect(request.request.method).toBe('GET');
    request.flush(response);
  });
});
