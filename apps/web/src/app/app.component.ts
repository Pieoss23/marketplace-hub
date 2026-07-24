import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import type {
  AnnouncementResponse,
  ChannelValidationResponse,
  CreateAnnouncementRequest,
  HealthResponse,
  PublishAnnouncementResponse,
} from '@marketplace-hub/contracts';
import { finalize } from 'rxjs';

import { AnnouncementsService } from './announcements.service';
import {
  AnnouncementCardComponent,
  type AnnouncementChannelDraft,
} from './announcement-card.component';
import { AnnouncementFormComponent } from './announcement-form.component';
import {
  AnnouncementSummaryComponent,
  type AnnouncementStatusFilter,
} from './announcement-summary.component';
import { HealthService } from './health.service';

const MOCK_CONNECTOR_CODE = 'mock';

const EMPTY_CHANNEL_DRAFT: AnnouncementChannelDraft = { enabled: false, category: '' };

@Component({
  selector: 'app-root',
  imports: [AnnouncementCardComponent, AnnouncementFormComponent, AnnouncementSummaryComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly healthService = inject(HealthService);
  private readonly announcementsService = inject(AnnouncementsService);

  protected readonly health = signal<HealthResponse | null>(null);
  protected readonly announcements = signal<readonly AnnouncementResponse[]>([]);
  protected readonly announcementSearchQuery = signal('');
  protected readonly announcementStatusFilter = signal<AnnouncementStatusFilter>('ALL');
  protected readonly channelDrafts = signal<
    Readonly<Record<string, AnnouncementChannelDraft>>
  >({});
  protected readonly validationResults = signal<
    Readonly<Record<string, ChannelValidationResponse>>
  >({});
  protected readonly publicationHistory = signal<
    Readonly<Record<string, readonly PublishAnnouncementResponse[]>>
  >({});
  protected readonly pageErrors = signal<readonly string[]>([]);
  protected readonly isLoadingAnnouncements = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly editingAnnouncementId = signal<string | null>(null);
  protected readonly pendingDeletionId = signal<string | null>(null);
  protected readonly linkedAnnouncementId = signal(readAnnouncementIdFromUrl(window.location.href));
  protected readonly extensionHandoffAnnouncementId = signal<string | null>(null);
  protected readonly busyAnnouncementIds = signal<ReadonlySet<string>>(new Set());

  protected readonly editingAnnouncement = computed(() => {
    const editingId = this.editingAnnouncementId();
    return editingId
      ? this.announcements().find((announcement) => announcement.id === editingId)
      : undefined;
  });
  protected readonly filteredAnnouncements = computed(() =>
    filterAnnouncements(
      this.announcements(),
      this.announcementSearchQuery(),
      this.announcementStatusFilter(),
    ),
  );

  ngOnInit(): void {
    this.checkBackend();
    this.loadAnnouncements();
  }

  protected submitAnnouncement(request: CreateAnnouncementRequest): void {
    if (this.isSubmitting()) {
      return;
    }

    const editingId = this.editingAnnouncementId();
    this.isSubmitting.set(true);
    this.pageErrors.set([]);
    const result = editingId
      ? this.announcementsService.update(editingId, request)
      : this.announcementsService.create(request);

    result.pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: (announcement) => {
        this.upsertAnnouncement(announcement);
        this.seedChannelDraft(announcement);
        this.exitEditMode();
      },
      error: (error: unknown) => this.pageErrors.set(extractErrorMessages(error)),
    });
  }

  protected editAnnouncement(announcement: AnnouncementResponse): void {
    if (this.isAnnouncementBusy(announcement.id)) {
      return;
    }
    this.pageErrors.set([]);
    this.editingAnnouncementId.set(announcement.id);
  }

  protected cancelEdit(): void {
    this.exitEditMode();
  }

  protected prepareForExtension(announcementId: string): void {
    const url = buildAnnouncementContextUrl(window.location.href, announcementId);
    history.replaceState(history.state, '', url);
    this.linkedAnnouncementId.set(announcementId);
    this.extensionHandoffAnnouncementId.set(announcementId);
  }

  protected setAnnouncementSearchQuery(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.announcementSearchQuery.set(event.target.value);
    }
  }

  protected setAnnouncementStatusFilter(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.announcementStatusFilter.set(event.target.value as AnnouncementStatusFilter);
    }
  }

  protected selectAnnouncementStatus(status: AnnouncementStatusFilter): void {
    this.announcementStatusFilter.set(status);
  }

  protected requestAnnouncementDeletion(announcementId: string): void {
    if (this.isAnnouncementBusy(announcementId)) {
      return;
    }
    this.pageErrors.set([]);
    this.pendingDeletionId.set(announcementId);
  }

  protected cancelAnnouncementDeletion(): void {
    this.pendingDeletionId.set(null);
  }

  protected confirmAnnouncementDeletion(announcementId: string): void {
    if (this.pendingDeletionId() !== announcementId || this.isAnnouncementBusy(announcementId)) {
      return;
    }
    this.setAnnouncementBusy(announcementId, true);
    this.pageErrors.set([]);
    this.announcementsService
      .remove(announcementId)
      .pipe(
        finalize(() => {
          this.setAnnouncementBusy(announcementId, false);
          this.pendingDeletionId.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.announcements.update((current) =>
            current.filter((announcement) => announcement.id !== announcementId),
          );
          if (this.editingAnnouncementId() === announcementId) {
            this.exitEditMode();
          }
        },
        error: (error: unknown) => this.pageErrors.set(extractErrorMessages(error)),
      });
  }

  protected setChannelEnabled(announcementId: string, enabled: boolean): void {
    this.channelDrafts.update((current) => ({
      ...current,
      [announcementId]: { ...(current[announcementId] ?? EMPTY_CHANNEL_DRAFT), enabled },
    }));
  }

  protected setChannelCategory(announcementId: string, category: string): void {
    this.channelDrafts.update((current) => ({
      ...current,
      [announcementId]: { ...(current[announcementId] ?? EMPTY_CHANNEL_DRAFT), category },
    }));
  }

  protected saveChannel(announcementId: string): void {
    if (this.isAnnouncementBusy(announcementId)) {
      return;
    }
    const draft = this.channelDrafts()[announcementId] ?? EMPTY_CHANNEL_DRAFT;
    const configuration = draft.category.trim() ? { category: draft.category.trim() } : {};

    this.setAnnouncementBusy(announcementId, true);
    this.pageErrors.set([]);
    this.announcementsService
      .enableChannel(announcementId, MOCK_CONNECTOR_CODE, {
        connectorCode: MOCK_CONNECTOR_CODE,
        enabled: draft.enabled,
        configuration,
      })
      .pipe(finalize(() => this.setAnnouncementBusy(announcementId, false)))
      .subscribe({
        next: (announcement) => {
          this.upsertAnnouncement(announcement);
          this.seedChannelDraft(announcement);
        },
        error: (error: unknown) => this.pageErrors.set(extractErrorMessages(error)),
      });
  }

  protected validateChannel(announcementId: string): void {
    if (this.isAnnouncementBusy(announcementId)) {
      return;
    }
    this.setAnnouncementBusy(announcementId, true);
    this.pageErrors.set([]);
    this.announcementsService
      .validateChannel(announcementId, MOCK_CONNECTOR_CODE)
      .pipe(finalize(() => this.setAnnouncementBusy(announcementId, false)))
      .subscribe({
        next: (result) =>
          this.validationResults.update((current) => ({ ...current, [announcementId]: result })),
        error: (error: unknown) => this.pageErrors.set(extractErrorMessages(error)),
      });
  }

  protected publishChannel(announcementId: string): void {
    if (this.isAnnouncementBusy(announcementId)) {
      return;
    }
    this.setAnnouncementBusy(announcementId, true);
    this.pageErrors.set([]);
    this.announcementsService
      .publishChannel(announcementId, MOCK_CONNECTOR_CODE)
      .pipe(finalize(() => this.setAnnouncementBusy(announcementId, false)))
      .subscribe({
        next: (attempt) => {
          this.publicationHistory.update((current) => ({
            ...current,
            [announcementId]: [attempt, ...(current[announcementId] ?? [])],
          }));
          this.refreshAnnouncement(announcementId);
        },
        error: (error: unknown) => this.pageErrors.set(extractErrorMessages(error)),
      });
  }

  protected loadPublications(announcementId: string): void {
    if (this.isAnnouncementBusy(announcementId)) {
      return;
    }
    this.setAnnouncementBusy(announcementId, true);
    this.announcementsService
      .findPublications(announcementId)
      .pipe(finalize(() => this.setAnnouncementBusy(announcementId, false)))
      .subscribe({
        next: (history) =>
          this.publicationHistory.update((current) => ({ ...current, [announcementId]: history })),
        error: (error: unknown) => this.pageErrors.set(extractErrorMessages(error)),
      });
  }

  protected channelDraft(announcementId: string): AnnouncementChannelDraft {
    return this.channelDrafts()[announcementId] ?? EMPTY_CHANNEL_DRAFT;
  }

  protected mockChannel(
    announcement: AnnouncementResponse,
  ): AnnouncementResponse['channels'][number] | undefined {
    return announcement.channels.find((channel) => channel.connectorCode === MOCK_CONNECTOR_CODE);
  }

  protected isAnnouncementBusy(announcementId: string): boolean {
    return this.busyAnnouncementIds().has(announcementId);
  }

  protected isLinkedAnnouncement(announcementId: string): boolean {
    return this.linkedAnnouncementId() === announcementId;
  }

  private checkBackend(): void {
    this.healthService.check().subscribe({
      next: (health) => this.health.set(health),
      error: () => this.health.set(null),
    });
  }

  private loadAnnouncements(): void {
    this.isLoadingAnnouncements.set(true);
    this.announcementsService
      .findAll()
      .pipe(finalize(() => this.isLoadingAnnouncements.set(false)))
      .subscribe({
        next: (announcements) => {
          this.announcements.set(announcements);
          for (const announcement of announcements) {
            this.seedChannelDraft(announcement);
          }
        },
        error: (error: unknown) => this.pageErrors.set(extractErrorMessages(error)),
      });
  }

  private refreshAnnouncement(announcementId: string): void {
    this.announcementsService.findOne(announcementId).subscribe({
      next: (announcement) => {
        this.upsertAnnouncement(announcement);
        this.seedChannelDraft(announcement);
      },
      error: (error: unknown) => this.pageErrors.set(extractErrorMessages(error)),
    });
  }

  private upsertAnnouncement(announcement: AnnouncementResponse): void {
    this.announcements.update((current) => {
      const exists = current.some(({ id }) => id === announcement.id);
      return exists
        ? current.map((item) => (item.id === announcement.id ? announcement : item))
        : [announcement, ...current];
    });
  }

  private seedChannelDraft(announcement: AnnouncementResponse): void {
    const channel = this.mockChannel(announcement);
    this.channelDrafts.update((current) => ({
      ...current,
      [announcement.id]: current[announcement.id] ?? {
        enabled: channel?.enabled ?? false,
        category: '',
      },
    }));
  }

  private exitEditMode(): void {
    this.editingAnnouncementId.set(null);
  }

  private setAnnouncementBusy(announcementId: string, busy: boolean): void {
    this.busyAnnouncementIds.update((current) => {
      const updated = new Set(current);
      if (busy) {
        updated.add(announcementId);
      } else {
        updated.delete(announcementId);
      }
      return updated;
    });
  }
}

function extractErrorMessages(error: unknown): readonly string[] {
  if (!(error instanceof HttpErrorResponse) || !isRecord(error.error)) {
    return ['Operazione non riuscita. Riprova.'];
  }

  const details = error.error['details'];
  if (Array.isArray(details)) {
    const messages = details
      .map((item) =>
        typeof item === 'string' ? item : isRecord(item) ? item['message'] : undefined,
      )
      .filter((message): message is string => typeof message === 'string');
    if (messages.length > 0) {
      return messages;
    }
  }

  const message = error.error['message'];
  if (typeof message === 'string') {
    return [message];
  }
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message;
  }
  return ['Operazione non riuscita. Riprova.'];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function readAnnouncementIdFromUrl(url: string): string | null {
  const announcementId = new URL(url).searchParams.get('announcementId')?.trim();
  return announcementId ? announcementId : null;
}

export function buildAnnouncementContextUrl(currentUrl: string, announcementId: string): string {
  const url = new URL(currentUrl);
  url.searchParams.set('announcementId', announcementId);
  return url.toString();
}

export function filterAnnouncements(
  announcements: readonly AnnouncementResponse[],
  query: string,
  status: AnnouncementStatusFilter,
): readonly AnnouncementResponse[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('it');
  return announcements.filter((announcement) => {
    if (status !== 'ALL' && announcement.status !== status) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    return [announcement.title, announcement.description, announcement.categoryCode].some((value) =>
      value.toLocaleLowerCase('it').includes(normalizedQuery),
    );
  });
}
