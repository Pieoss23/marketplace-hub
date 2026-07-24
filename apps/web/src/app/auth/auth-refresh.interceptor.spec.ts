import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { authRefreshInterceptor } from './auth-refresh.interceptor';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authRefreshInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'marketplace-hub.auth',
      JSON.stringify({
        accessToken: 'token-1',
        refreshToken: 'refresh-1',
        user: { id: 'user-1', email: 'a@example.com' },
      }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, authRefreshInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('refreshes the session and retries the original request on a 401', () => {
    let result: unknown;
    httpClient.get('/api/announcements').subscribe((response) => (result = response));

    httpTesting
      .expectOne('/api/announcements')
      .flush(
        { message: 'Invalid or expired session.' },
        { status: 401, statusText: 'Unauthorized' },
      );

    httpTesting.expectOne('/api/auth/refresh').flush({
      accessToken: 'token-2',
      refreshToken: 'refresh-2',
      user: { id: 'user-1', email: 'a@example.com' },
    });

    const retried = httpTesting.expectOne('/api/announcements');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer token-2');
    retried.flush([{ id: 'ann-1' }]);

    expect(result).toEqual([{ id: 'ann-1' }]);
  });

  it('de-dupes concurrent 401s into a single refresh call', () => {
    let firstResult: unknown;
    let secondResult: unknown;
    httpClient.get('/api/announcements').subscribe((response) => (firstResult = response));
    httpClient.get('/api/other').subscribe((response) => (secondResult = response));

    httpTesting
      .expectOne('/api/announcements')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    httpTesting.expectOne('/api/other').flush({}, { status: 401, statusText: 'Unauthorized' });

    httpTesting.expectOne('/api/auth/refresh').flush({
      accessToken: 'token-2',
      refreshToken: 'refresh-2',
      user: { id: 'user-1', email: 'a@example.com' },
    });

    httpTesting.expectOne('/api/announcements').flush([{ id: 'ann-1' }]);
    httpTesting.expectOne('/api/other').flush([{ id: 'other-1' }]);

    expect(firstResult).toEqual([{ id: 'ann-1' }]);
    expect(secondResult).toEqual([{ id: 'other-1' }]);
  });

  it('logs out and redirects to /login when the refresh call itself fails', () => {
    let error: unknown;
    httpClient.get('/api/announcements').subscribe({ error: (err) => (error = err) });

    httpTesting
      .expectOne('/api/announcements')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    httpTesting
      .expectOne('/api/auth/refresh')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    const logoutRequest = httpTesting.expectOne('/api/auth/logout');
    expect(logoutRequest.request.body).toEqual({ refreshToken: 'refresh-1' });
    logoutRequest.flush(null);

    expect(error).toBeTruthy();
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('does not attempt a refresh for a 401 from the auth endpoints themselves', () => {
    let error: unknown;
    httpClient
      .post('/api/auth/login', { email: 'a@example.com', password: 'x' })
      .subscribe({ error: (err) => (error = err) });

    httpTesting.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(error).toBeTruthy();
    httpTesting.expectNone('/api/auth/refresh');
  });
});
