import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { AnnouncementResponse } from '@marketplace-hub/contracts';

export type AnnouncementStatusFilter = AnnouncementResponse['status'] | 'ALL';

interface SummaryItem {
  readonly status: AnnouncementStatusFilter;
  readonly label: string;
  readonly count: number;
}

const SUMMARY_LABELS: ReadonlyArray<{
  readonly status: AnnouncementStatusFilter;
  readonly label: string;
}> = [
  { status: 'ALL', label: 'Totale' },
  { status: 'DRAFT', label: 'Bozze' },
  { status: 'READY', label: 'Pronti' },
  { status: 'PARTIALLY_PUBLISHED', label: 'Parziali' },
  { status: 'PUBLISHED', label: 'Pubblicati' },
];

@Component({
  selector: 'app-announcement-summary',
  templateUrl: './announcement-summary.component.html',
  styleUrl: './announcement-summary.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementSummaryComponent {
  readonly announcements = input.required<readonly AnnouncementResponse[]>();
  readonly activeStatus = input<AnnouncementStatusFilter>('ALL');
  readonly statusSelected = output<AnnouncementStatusFilter>();

  protected readonly items = computed<readonly SummaryItem[]>(() => {
    const announcements = this.announcements();
    return SUMMARY_LABELS.map(({ status, label }) => ({
      status,
      label,
      count:
        status === 'ALL'
          ? announcements.length
          : announcements.filter((announcement) => announcement.status === status).length,
    }));
  });
}
