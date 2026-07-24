import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type {
  AnnouncementResponse,
  ChannelValidationResponse,
  PublishAnnouncementResponse,
} from '@marketplace-hub/contracts';

export interface AnnouncementChannelDraft {
  readonly enabled: boolean;
  readonly category: string;
}

@Component({
  selector: 'app-announcement-card',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './announcement-card.component.html',
  styleUrl: './announcement-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementCardComponent {
  readonly announcement = input.required<AnnouncementResponse>();
  readonly channelDraft = input.required<AnnouncementChannelDraft>();
  readonly validation = input<ChannelValidationResponse>();
  readonly publicationHistory = input<readonly PublishAnnouncementResponse[]>();
  readonly busy = input(false);
  readonly linked = input(false);
  readonly extensionHandoff = input(false);
  readonly deletionPending = input(false);

  readonly extensionRequested = output<void>();
  readonly editRequested = output<void>();
  readonly deletionRequested = output<void>();
  readonly deletionCancelled = output<void>();
  readonly deletionConfirmed = output<void>();
  readonly channelEnabledChanged = output<boolean>();
  readonly channelCategoryChanged = output<string>();
  readonly channelSaveRequested = output<void>();
  readonly validationRequested = output<void>();
  readonly publicationRequested = output<void>();
  readonly historyRequested = output<void>();

  protected setChannelEnabled(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.channelEnabledChanged.emit(event.target.checked);
    }
  }

  protected setChannelCategory(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.channelCategoryChanged.emit(event.target.value);
    }
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

  protected publishButtonLabel(): string {
    if (this.busy()) {
      return 'Attendi…';
    }
    const status = this.mockChannel()?.status;
    if (status === 'PUBLISHED') {
      return 'Pubblicato';
    }
    if (status === 'FAILED') {
      return 'Riprova pubblicazione';
    }
    return 'Pubblica su Mock';
  }

  protected isPublishDisabled(): boolean {
    return this.busy() || this.mockChannel()?.status === 'PUBLISHED';
  }

  protected mockChannel(): AnnouncementResponse['channels'][number] | undefined {
    return this.announcement().channels.find((channel) => channel.connectorCode === 'mock');
  }
}
