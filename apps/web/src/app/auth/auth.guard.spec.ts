import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlTree, provideRouter } from '@angular/router';

import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  afterEach(() => localStorage.clear());

  it('allows navigation when authenticated', () => {
    localStorage.setItem(
      'marketplace-hub.auth',
      JSON.stringify({
        accessToken: 'token',
        refreshToken: 'refresh-token',
        user: { id: 'user-1', email: 'test@example.com' },
      }),
    );
    TestBed.inject(AuthService);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/' } as never),
    );

    expect(result).toBe(true);
  });

  it('redirects to /login with a returnUrl when not authenticated', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/?announcementId=abc' } as never),
    );

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toContain('/login');
    expect((result as UrlTree).toString()).toContain('returnUrl');
  });
});
