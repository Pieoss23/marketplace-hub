import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  AuthResponse,
  LoginRequest,
  PublicUserResponse,
  SignupRequest,
} from '@marketplace-hub/contracts';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs';

import { environment } from '../../environments/environment';

const STORAGE_KEY = 'marketplace-hub.auth';

interface StoredSession {
  readonly accessToken: string;
  readonly user: PublicUserResponse;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly resourceUrl = `${environment.apiBaseUrl}/auth`;

  private readonly session = signal<StoredSession | null>(readStoredSession());

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

  logout(): void {
    this.session.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private setSession(response: AuthResponse): void {
    const session: StoredSession = { accessToken: response.accessToken, user: response.user };
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
    if (typeof parsed?.accessToken === 'string' && typeof parsed.user?.id === 'string') {
      return parsed as StoredSession;
    }
    return null;
  } catch {
    return null;
  }
}
