import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type {
  AnnouncementResponse,
  CreateAnnouncementRequest,
} from '@marketplace-hub/contracts';

type Condition = CreateAnnouncementRequest['condition'];

const CONDITIONS: ReadonlyArray<{ value: Condition; label: string }> = [
  { value: 'NEW', label: 'Nuovo' },
  { value: 'LIKE_NEW', label: 'Come nuovo' },
  { value: 'USED_GOOD', label: 'Usato - buono stato' },
  { value: 'USED_ACCEPTABLE', label: 'Usato - stato accettabile' },
  { value: 'FOR_PARTS', label: 'Per ricambi' },
];

@Component({
  selector: 'app-announcement-form',
  imports: [ReactiveFormsModule],
  templateUrl: './announcement-form.component.html',
  styleUrl: './announcement-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementFormComponent {
  readonly editingAnnouncement = input<AnnouncementResponse>();
  readonly submitting = input(false);
  readonly submitted = output<CreateAnnouncementRequest>();
  readonly editCancelled = output<void>();

  protected readonly conditions = CONDITIONS;
  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(5000)]],
    priceEuros: [
      0,
      [Validators.required, Validators.min(0.01), Validators.pattern(/^\d+(\.\d{1,2})?$/)],
    ],
    currency: ['EUR', [Validators.required, Validators.maxLength(3)]],
    categoryCode: ['', [Validators.required, Validators.maxLength(200)]],
    condition: ['USED_GOOD' as Condition, [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
  });

  constructor() {
    effect(() => {
      const announcement = this.editingAnnouncement();
      this.form.reset(
        announcement
          ? {
              title: announcement.title,
              description: announcement.description,
              priceEuros: announcement.price / 100,
              currency: announcement.currency,
              categoryCode: announcement.categoryCode,
              condition: announcement.condition,
              quantity: announcement.quantity,
            }
          : emptyFormValue(),
      );
    });
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const value = this.form.getRawValue();
    this.submitted.emit({
      title: value.title.trim(),
      description: value.description.trim(),
      priceAmount: Math.round(value.priceEuros * 100),
      currency: value.currency.trim().toUpperCase(),
      categoryCode: value.categoryCode.trim(),
      condition: value.condition,
      quantity: value.quantity,
    });
  }
}

function emptyFormValue(): {
  readonly title: string;
  readonly description: string;
  readonly priceEuros: number;
  readonly currency: string;
  readonly categoryCode: string;
  readonly condition: Condition;
  readonly quantity: number;
} {
  return {
    title: '',
    description: '',
    priceEuros: 0,
    currency: 'EUR',
    categoryCode: '',
    condition: 'USED_GOOD',
    quantity: 1,
  };
}
