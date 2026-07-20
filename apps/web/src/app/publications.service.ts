import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  CreateMockPublicationRequest,
  PublicationResponse,
  PublishListingResponse,
} from '@marketplace-hub/contracts';
import type { Observable } from 'rxjs';

import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class PublicationsService {
  private readonly http = inject(HttpClient);

  publishMock(
    listingId: string,
    request: CreateMockPublicationRequest,
  ): Observable<PublishListingResponse> {
    return this.http.post<PublishListingResponse>(
      `${environment.apiBaseUrl}/listings/${listingId}/publications/mock`,
      request,
    );
  }

  findByListingId(listingId: string): Observable<PublicationResponse[]> {
    return this.http.get<PublicationResponse[]>(
      `${environment.apiBaseUrl}/listings/${listingId}/publications`,
    );
  }
}
