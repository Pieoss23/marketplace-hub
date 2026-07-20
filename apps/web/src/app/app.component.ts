import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type {
  AnnouncementResponse,
  ChannelValidationResponse,
  CreateAnnouncementRequest,
  HealthResponse,
  PublishAnnouncementResponse,
} from '@marketplace-hub/contracts';
import { finalize } from 'rxjs';

import { AnnouncementsService } from './announcements.service';
import { HealthService } from './health.service';

const MOCK_CONNECTOR_CODE = 'mock';

type Condition = CreateAnnouncementRequest['condition'];

const CONDITIONS: ReadonlyArray<{ value: Condition; label: string }> = [
  { value: 'NEW', label: 'Nuovo' },
  { value: 'LIKE_NEW', label: 'Come nuovo' },
  { value: 'USED_GOOD', label: 'Usato - buono stato' },
  { value: 'USED_ACCEPTABLE', label: 'Usato - stato accettabile' },
  { value: 'FOR_PARTS', label: 'Per ricambi' },
];

interface ChannelDraft {
  readonly enabled: boolean;
  readonly category: string;
}

const EMPTY_CHANNEL_DRAFT: ChannelDraft = { enabled: false, category: '' };

@Component({
  selector: 'app-root',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  protected readonly conditions = CONDITIONS;

  private readonly formBuilder = inject(FormBuilder);
  private readonly healthService = inject(HealthService);
  private readonly announcementsService = inject(AnnouncementsService);

  protected readonly announcementForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(4000)]],
    priceEuros: [0, [Validators.required, Validators.min(0)]],
    currency: ['EUR', [Validators.required, Validators.maxLength(3)]],
    categoryCode: ['', [Validators.required]],
    condition: ['USED_GOOD' as Condition, [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(1)]],
  });

  protected readonly health = signal<HealthResponse | null>(null);
  protected readonly announcements = signal<readonly AnnouncementResponse[]>([]);
  protected readonly channelDrafts = signal<Readonly<Record<string, ChannelDraft>>>({});
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
  protected readonly busyAnnouncementIds = signal<ReadonlySet<string>>(new Set());

  protected readonly isEditing = computed(() => this.editingAnnouncementId() !== null);

  ngOnInit(): void {
    this.checkBackend();
    this.loadAnnouncements();
  }

  protected submitAnnouncement(): void {
    this.announcementForm.markAllAsTouched();
    if (this.announcementForm.invalid || this.isSubmitting()) {
      return;
    }

    const value = this.announcementForm.getRawValue();
    const request: CreateAnnouncementRequest = {
      title: value.title.trim(),
      description: value.description.trim(),
      priceAmount: Math.round(value.priceEuros * 100),
      currency: value.currency.trim().toUpperCase(),
      categoryCode: value.categoryCode.trim(),
      condition: value.condition,
      quantity: value.quantity,
    };

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
    this.announcementForm.reset({
      title: announcement.title,
      description: announcement.description,
      priceEuros: announcement.price / 100,
      currency: announcement.currency,
      categoryCode: announcement.categoryCode,
      condition: announcement.condition,
      quantity: announcement.quantity,
    });
  }

  protected cancelEdit(): void {
    this.exitEditMode();
  }

  protected setChannelEnabled(announcementId: string, event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }
    const enabled = event.target.checked;
    this.channelDrafts.update((current) => ({
      ...current,
      [announcementId]: { ...(current[announcementId] ?? EMPTY_CHANNEL_DRAFT), enabled },
    }));
  }

  protected setChannelCategory(announcementId: string, event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }
    const category = event.target.value;
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

  protected announcementStatusLabel(status: AnnouncementResponse['status']): string {
    const labels: Record<AnnouncementResponse['status'], string> = {
      DRAFT: 'Bozza',
      READY: 'Pronto',
      PARTIALLY_PUBLISHED: 'Pubblicato parzialmente',
      PUBLISHED: 'Pubblicato',
    };
    return labels[status];
  }

  protected channelStatusLabel(status: PublishAnnouncementResponse['status']): string {
    const labels: Record<PublishAnnouncementResponse['status'], string> = {
      READY: 'Pronto',
      PUBLISHING: 'Pubblicazione…',
      PUBLISHED: 'Pubblicato',
      FAILED: 'Fallito',
    };
    return labels[status];
  }

  protected channelDraft(announcementId: string): ChannelDraft {
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
    this.announcementForm.reset({
      title: '',
      description: '',
      priceEuros: 0,
      currency: 'EUR',
      categoryCode: '',
      condition: 'USED_GOOD',
      quantity: 1,
    });
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
      .map((item) => (typeof item === 'string' ? item : isRecord(item) ? item['message'] : undefined))
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
