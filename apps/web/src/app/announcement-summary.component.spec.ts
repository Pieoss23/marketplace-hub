import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AnnouncementResponse } from '@marketplace-hub/contracts';

import {
  AnnouncementSummaryComponent,
  type AnnouncementStatusFilter,
} from './announcement-summary.component';

const announcements: readonly AnnouncementResponse[] = [
  {
    id: 'announcement-1',
    title: 'Keyboard',
    description: 'Mechanical keyboard',
    price: 7500,
    currency: 'EUR',
    categoryCode: 'electronics',
    condition: 'USED_GOOD',
    quantity: 1,
    status: 'READY',
    channels: [],
    createdAt: '2026-07-12T08:00:00.000Z',
    updatedAt: '2026-07-12T08:00:00.000Z',
  },
  {
    id: 'announcement-2',
    title: 'Mouse',
    description: 'Vintage mouse',
    price: 2500,
    currency: 'EUR',
    categoryCode: 'electronics',
    condition: 'USED_GOOD',
    quantity: 1,
    status: 'PUBLISHED',
    channels: [],
    createdAt: '2026-07-12T08:00:00.000Z',
    updatedAt: '2026-07-12T08:00:00.000Z',
  },
];

describe('AnnouncementSummaryComponent', () => {
  let fixture: ComponentFixture<AnnouncementSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnouncementSummaryComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AnnouncementSummaryComponent);
    fixture.componentRef.setInput('announcements', announcements);
    fixture.detectChanges();
  });

  it('renders totals grouped by status', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('2');
    expect(text).toContain('Totale');
    expect(text).toContain('1');
    expect(text).toContain('Pronti');
    expect(text).toContain('Pubblicati');
  });

  it('emits the selected status', () => {
    let selected: AnnouncementStatusFilter | undefined;
    fixture.componentInstance.statusSelected.subscribe((status) => {
      selected = status;
    });

    const buttons = fixture.nativeElement.querySelectorAll(
      'button',
    ) as NodeListOf<HTMLButtonElement>;
    buttons[2]?.click();

    expect(selected).toBe('READY');
  });
});
