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
    request.flush({ accessToken: 'token-abc', user: { id: 'user-1', email: 'test@example.com' } });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()).toEqual({ id: 'user-1', email: 'test@example.com' });
    expect(service.accessToken()).toBe('token-abc');
  });

  it('logs in and persists the session across a fresh service instance', () => {
    service.login({ email: 'test@example.com', password: 'password1234' }).subscribe();
    httpTesting
      .expectOne('/api/auth/login')
      .flush({ accessToken: 'token-xyz', user: { id: 'user-1', email: 'test@example.com' } });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const restored = TestBed.inject(AuthService);

    expect(restored.isAuthenticated()).toBe(true);
    expect(restored.accessToken()).toBe('token-xyz');

    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('clears the session on logout', () => {
    service.login({ email: 'test@example.com', password: 'password1234' }).subscribe();
    httpTesting
      .expectOne('/api/auth/login')
      .flush({ accessToken: 'token-xyz', user: { id: 'user-1', email: 'test@example.com' } });

    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.accessToken()).toBeNull();
    expect(localStorage.getItem('marketplace-hub.auth')).toBeNull();
  });
});
