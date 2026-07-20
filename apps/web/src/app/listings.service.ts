import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  CreateListingRequest,
  ListingResponse,
  UpdateListingRequest,
} from '@marketplace-hub/contracts';
import type { Observable } from 'rxjs';

import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ListingsService {
  private readonly http = inject(HttpClient);
  private readonly resourceUrl = `${environment.apiBaseUrl}/listings`;

  findAll(): Observable<ListingResponse[]> {
    return this.http.get<ListingResponse[]>(this.resourceUrl);
  }

  create(request: CreateListingRequest): Observable<ListingResponse> {
    return this.http.post<ListingResponse>(this.resourceUrl, request);
  }

  update(id: string, request: UpdateListingRequest): Observable<ListingResponse> {
    return this.http.patch<ListingResponse>(`${this.resourceUrl}/${id}`, request);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${id}`);
  }
}
