import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from './auth.service';

const REFRESH_EXEMPT_PATHS = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/logout'];

/**
 * Must run after `authInterceptor` in the `withInterceptors([...])` array.
 * On a 401 (other than from the auth endpoints themselves) it asks
 * `AuthService.refreshSession()` for a new token pair and retries the
 * original request once with the fresh access token. If the refresh itself
 * fails, the session is cleared and the user is sent back to `/login`.
 */
export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        REFRESH_EXEMPT_PATHS.some((path) => req.url.includes(path))
      ) {
        return throwError(() => error);
      }

      return authService.refreshSession().pipe(
        switchMap((response) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${response.accessToken}` } })),
        ),
        catchError((refreshError: unknown) => {
          authService.logout();
          void router.navigateByUrl('/login');
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
