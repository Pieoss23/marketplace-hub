import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('starts unauthenticated with no stored session', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.accessToken()).toBeNull();
  });

  it('signs up, stores the session and exposes the current user', () => {
    service.signup({ email: 'test@example.com', password: 'password1234' }).subscribe();

    const request = httpTesting.expectOne('/api/auth/signup');
    expect(request.request.method).toBe('POST');
    request.flush({
      accessToken: 'token-abc',
      refreshToken: 'refresh-abc',
      user: { id: 'user-1', email: 'test@example.com' },
    });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()).toEqual({ id: 'user-1', email: 'test@example.com' });
    expect(service.accessToken()).toBe('token-abc');
  });

  it('logs in and persists the session across a fresh service instance', () => {
    service.login({ email: 'test@example.com', password: 'password1234' }).subscribe();
    httpTesting.expectOne('/api/auth/login').flush({
      accessToken: 'token-xyz',
      refreshToken: 'refresh-xyz',
      user: { id: 'user-1', email: 'test@example.com' },
    });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const restored = TestBed.inject(AuthService);

    expect(restored.isAuthenticated()).toBe(true);
    expect(restored.accessToken()).toBe('token-xyz');

    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('clears the session on logout and revokes the refresh token server-side', () => {
    service.login({ email: 'test@example.com', password: 'password1234' }).subscribe();
    httpTesting.expectOne('/api/auth/login').flush({
      accessToken: 'token-xyz',
      refreshToken: 'refresh-xyz',
      user: { id: 'user-1', email: 'test@example.com' },
    });

    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.accessToken()).toBeNull();
    expect(localStorage.getItem('marketplace-hub.auth')).toBeNull();

    const logoutRequest = httpTesting.expectOne('/api/auth/logout');
    expect(logoutRequest.request.body).toEqual({ refreshToken: 'refresh-xyz' });
    logoutRequest.flush(null);
  });

  describe('refreshSession', () => {
    function loginAndFlush(): void {
      service.login({ email: 'test@example.com', password: 'password1234' }).subscribe();
      httpTesting.expectOne('/api/auth/login').flush({
        accessToken: 'token-1',
        refreshToken: 'refresh-1',
        user: { id: 'user-1', email: 'test@example.com' },
      });
    }

    it('posts the stored refresh token and replaces the session on success', () => {
      loginAndFlush();

      let result: { accessToken: string } | undefined;
      service.refreshSession().subscribe((response) => (result = response));

      const request = httpTesting.expectOne('/api/auth/refresh');
      expect(request.request.body).toEqual({ refreshToken: 'refresh-1' });
      request.flush({
        accessToken: 'token-2',
        refreshToken: 'refresh-2',
        user: { id: 'user-1', email: 'test@example.com' },
      });

      expect(result?.accessToken).toBe('token-2');
      expect(service.accessToken()).toBe('token-2');
    });

    it('de-duplicates concurrent calls into a single HTTP request', () => {
      loginAndFlush();

      let firstResult: { accessToken: string } | undefined;
      let secondResult: { accessToken: string } | undefined;
      service.refreshSession().subscribe((response) => (firstResult = response));
      service.refreshSession().subscribe((response) => (secondResult = response));

      httpTesting.expectOne('/api/auth/refresh').flush({
        accessToken: 'token-2',
        refreshToken: 'refresh-2',
        user: { id: 'user-1', email: 'test@example.com' },
      });

      expect(firstResult?.accessToken).toBe('token-2');
      expect(secondResult?.accessToken).toBe('token-2');
    });

    it('errors without an HTTP call when there is no session', () => {
      let error: unknown;
      service.refreshSession().subscribe({ error: (err) => (error = err) });

      expect(error).toBeInstanceOf(Error);
      httpTesting.expectNone('/api/auth/refresh');
    });
  });
});
