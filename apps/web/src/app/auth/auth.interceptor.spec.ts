import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('does not set an Authorization header when there is no session', () => {
    httpClient.get('/api/announcements').subscribe();

    const request = httpTesting.expectOne('/api/announcements');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);
  });

  it('attaches the bearer token when authenticated', () => {
    localStorage.setItem(
      'marketplace-hub.auth',
      JSON.stringify({
        accessToken: 'token-abc',
        refreshToken: 'refresh-token-abc',
        user: { id: 'user-1', email: 'a@example.com' },
      }),
    );
    TestBed.inject(AuthService);

    httpClient.post('/api/announcements', {}).subscribe();

    const request = httpTesting.expectOne('/api/announcements');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-abc');
    request.flush({});
  });
});
