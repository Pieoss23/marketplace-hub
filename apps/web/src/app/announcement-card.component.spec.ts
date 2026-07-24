import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AnnouncementResponse } from '@marketplace-hub/contracts';

import { AnnouncementCardComponent } from './announcement-card.component';

const announcement: AnnouncementResponse = {
  id: 'announcement-1',
  title: 'Mechanical keyboard',
  description: 'Used mechanical keyboard in good condition.',
  price: 7500,
  currency: 'EUR',
  categoryCode: 'electronics',
  condition: 'USED_GOOD',
  quantity: 1,
  status: 'READY',
  channels: [],
  createdAt: '2026-07-12T08:00:00.000Z',
  updatedAt: '2026-07-12T08:00:00.000Z',
};

describe('AnnouncementCardComponent', () => {
  let fixture: ComponentFixture<AnnouncementCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnouncementCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnnouncementCardComponent);
    fixture.componentRef.setInput('announcement', announcement);
    fixture.componentRef.setInput('channelDraft', { enabled: false, category: '' });
    fixture.detectChanges();
  });

  it('renders the announcement and emits only explicit card actions', () => {
    let editRequested = false;
    fixture.componentInstance.editRequested.subscribe(() => {
      editRequested = true;
    });

    (fixture.nativeElement.querySelector('.edit-action') as HTMLButtonElement).click();

    expect(fixture.nativeElement.textContent).toContain('Mechanical keyboard');
    expect(editRequested).toBeTrue();
  });

  it('emits typed channel draft changes', () => {
    let enabled = false;
    let category = '';
    fixture.componentInstance.channelEnabledChanged.subscribe((value) => {
      enabled = value;
    });
    fixture.componentInstance.channelCategoryChanged.subscribe((value) => {
      category = value;
    });

    const checkbox = fixture.nativeElement.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    const categoryInput = fixture.nativeElement.querySelector(
      'input[placeholder="vintage_keyboards"]',
    ) as HTMLInputElement;
    categoryInput.value = 'keyboards';
    categoryInput.dispatchEvent(new Event('input'));

    expect(enabled).toBeTrue();
    expect(category).toBe('keyboards');
  });
});
