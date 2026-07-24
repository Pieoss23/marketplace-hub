import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  AuthResponse,
  LoginRequest,
  LogoutRequest,
  PublicUserResponse,
  RefreshRequest,
  SignupRequest,
} from '@marketplace-hub/contracts';
import type { Observable } from 'rxjs';
import { finalize, shareReplay, tap, throwError } from 'rxjs';

import { environment } from '../../environments/environment';

const STORAGE_KEY = 'marketplace-hub.auth';

interface StoredSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: PublicUserResponse;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly resourceUrl = `${environment.apiBaseUrl}/auth`;

  private readonly session = signal<StoredSession | null>(readStoredSession());
  private refreshInFlight: Observable<AuthResponse> | null = null;

  readonly currentUser = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);

  accessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  signup(request: SignupRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.resourceUrl}/signup`, request)
      .pipe(tap((response) => this.setSession(response)));
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.resourceUrl}/login`, request)
      .pipe(tap((response) => this.setSession(response)));
  }

  /** De-duplicated silent refresh: concurrent callers share one in-flight HTTP call. */
  refreshSession(): Observable<AuthResponse> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    const refreshToken = this.session()?.refreshToken;
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const request$ = this.http
      .post<AuthResponse>(`${this.resourceUrl}/refresh`, {
        refreshToken,
      } satisfies RefreshRequest)
      .pipe(
        tap((response) => this.setSession(response)),
        finalize(() => {
          this.refreshInFlight = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.refreshInFlight = request$;
    return request$;
  }

  logout(): void {
    const refreshToken = this.session()?.refreshToken;
    this.session.set(null);
    localStorage.removeItem(STORAGE_KEY);
    if (refreshToken) {
      // Best-effort server-side revocation; the local session is already
      // cleared regardless of whether this call succeeds.
      this.http
        .post(`${this.resourceUrl}/logout`, { refreshToken } satisfies LogoutRequest)
        .subscribe({ error: () => undefined });
    }
  }

  private setSession(response: AuthResponse): void {
    const session: StoredSession = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
    };
    this.session.set(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredSession> | null;
    if (
      typeof parsed?.accessToken === 'string' &&
      typeof parsed.refreshToken === 'string' &&
      typeof parsed.user?.id === 'string'
    ) {
      return parsed as StoredSession;
    }
    return null;
  } catch {
    return null;
  }
}
