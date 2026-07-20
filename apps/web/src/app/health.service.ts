import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { HealthResponse } from '@marketplace-hub/contracts';
import { Observable } from 'rxjs';

import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);

  check(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${environment.apiBaseUrl}/health`);
  }
}
