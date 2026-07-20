import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  AnnouncementResponse,
  ChannelValidationResponse,
  CreateAnnouncementRequest,
  EnableAnnouncementChannelRequest,
  PublishAnnouncementResponse,
  UpdateAnnouncementRequest,
} from '@marketplace-hub/contracts';
import type { Observable } from 'rxjs';

import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class AnnouncementsService {
  private readonly http = inject(HttpClient);
  private readonly resourceUrl = `${environment.apiBaseUrl}/announcements`;

  findAll(): Observable<AnnouncementResponse[]> {
    return this.http.get<AnnouncementResponse[]>(this.resourceUrl);
  }

  findOne(id: string): Observable<AnnouncementResponse> {
    return this.http.get<AnnouncementResponse>(`${this.resourceUrl}/${id}`);
  }

  create(request: CreateAnnouncementRequest): Observable<AnnouncementResponse> {
    return this.http.post<AnnouncementResponse>(this.resourceUrl, request);
  }

  update(id: string, request: UpdateAnnouncementRequest): Observable<AnnouncementResponse> {
    return this.http.put<AnnouncementResponse>(`${this.resourceUrl}/${id}`, request);
  }

  enableChannel(
    id: string,
    connectorCode: string,
    request: EnableAnnouncementChannelRequest,
  ): Observable<AnnouncementResponse> {
    return this.http.put<AnnouncementResponse>(
      `${this.resourceUrl}/${id}/channels/${connectorCode}`,
      request,
    );
  }

  validateChannel(id: string, connectorCode: string): Observable<ChannelValidationResponse> {
    return this.http.post<ChannelValidationResponse>(
      `${this.resourceUrl}/${id}/channels/${connectorCode}/validate`,
      {},
    );
  }

  publishChannel(id: string, connectorCode: string): Observable<PublishAnnouncementResponse> {
    return this.http.post<PublishAnnouncementResponse>(
      `${this.resourceUrl}/${id}/channels/${connectorCode}/publish`,
      {},
    );
  }

  findPublications(id: string): Observable<PublishAnnouncementResponse[]> {
    return this.http.get<PublishAnnouncementResponse[]>(`${this.resourceUrl}/${id}/publications`);
  }
}
