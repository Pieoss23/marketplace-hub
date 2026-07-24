import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  AnnouncementResponse,
  CreateAnnouncementRequest,
} from '@marketplace-hub/contracts';

import { AnnouncementFormComponent } from './announcement-form.component';

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

describe('AnnouncementFormComponent', () => {
  let fixture: ComponentFixture<AnnouncementFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnouncementFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnnouncementFormComponent);
    fixture.detectChanges();
  });

  it('emits a normalized creation request from a valid form', () => {
    let submitted: CreateAnnouncementRequest | undefined;
    fixture.componentInstance.submitted.subscribe((request) => {
      submitted = request;
    });
    setInput('input[formControlName="title"]', '  Mechanical keyboard  ');
    setInput('textarea[formControlName="description"]', '  Used keyboard  ');
    setInput('input[formControlName="priceEuros"]', '75.50');
    setInput('input[formControlName="categoryCode"]', '  electronics  ');

    submitForm();

    expect(submitted).toEqual({
      title: 'Mechanical keyboard',
      description: 'Used keyboard',
      priceAmount: 7550,
      currency: 'EUR',
      categoryCode: 'electronics',
      condition: 'USED_GOOD',
      quantity: 1,
    });
  });

  it('shows local validation errors without emitting an invalid request', () => {
    let emissionCount = 0;
    fixture.componentInstance.submitted.subscribe(() => {
      emissionCount += 1;
    });

    submitForm();
    fixture.detectChanges();

    expect(emissionCount).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Inserisci un titolo');
    expect(fixture.nativeElement.textContent).toContain('Inserisci una descrizione');
    expect(fixture.nativeElement.textContent).toContain('Inserisci un prezzo');
  });

  it('prefills edit values and emits cancellation explicitly', () => {
    let cancelled = false;
    fixture.componentInstance.editCancelled.subscribe(() => {
      cancelled = true;
    });
    fixture.componentRef.setInput('editingAnnouncement', announcement);
    fixture.detectChanges();

    expect(inputValue('input[formControlName="title"]')).toBe(announcement.title);
    expect(inputValue('input[formControlName="priceEuros"]')).toBe('75');
    expect(fixture.nativeElement.textContent).toContain('Modifica inserzione');

    (fixture.nativeElement.querySelector('.secondary-action') as HTMLButtonElement).click();

    expect(cancelled).toBeTrue();
  });

  it('does not emit while a submission is already in progress', () => {
    let emissionCount = 0;
    fixture.componentInstance.submitted.subscribe(() => {
      emissionCount += 1;
    });
    fixture.componentRef.setInput('submitting', true);
    setInput('input[formControlName="title"]', 'Mechanical keyboard');
    setInput('textarea[formControlName="description"]', 'Used keyboard');
    setInput('input[formControlName="priceEuros"]', '75');
    setInput('input[formControlName="categoryCode"]', 'electronics');
    fixture.detectChanges();

    submitForm();

    expect(emissionCount).toBe(0);
  });

  function setInput(selector: string, value: string): void {
    const input = fixture.nativeElement.querySelector(selector) as
      | HTMLInputElement
      | HTMLTextAreaElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function inputValue(selector: string): string {
    return (fixture.nativeElement.querySelector(selector) as HTMLInputElement).value;
  }

  function submitForm(): void {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
  }
});
