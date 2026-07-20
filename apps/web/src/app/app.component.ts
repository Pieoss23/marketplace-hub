import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type {
  CreateListingRequest,
  HealthResponse,
  ListingResponse,
  PublicationResponse,
} from '@marketplace-hub/contracts';
import { finalize } from 'rxjs';

import { HealthService } from './health.service';
import { ListingsService } from './listings.service';
import { PublicationsService } from './publications.service';

@Component({
  selector: 'app-root',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly healthService = inject(HealthService);
  private readonly listingsService = inject(ListingsService);
  private readonly publicationsService = inject(PublicationsService);

  protected readonly listingForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(4000)]],
    priceEuros: [0, [Validators.required, Validators.min(0)]],
    imageUrl: [''],
  });

  protected readonly editListingForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(4000)]],
    priceEuros: [0, [Validators.required, Validators.min(0)]],
  });

  protected readonly health = signal<HealthResponse | null>(null);
  protected readonly listings = signal<readonly ListingResponse[]>([]);
  protected readonly publications = signal<
    Readonly<Partial<Record<string, readonly PublicationResponse[]>>>
  >({});
  protected readonly categories = signal<Readonly<Partial<Record<string, string>>>>({});
  protected readonly pageErrors = signal<readonly string[]>([]);
  protected readonly isLoadingListings = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly editingListingId = signal<string | null>(null);
  protected readonly busyListingIds = signal<ReadonlySet<string>>(new Set());

  ngOnInit(): void {
    this.checkBackend();
    this.loadListings();
  }

  protected createListing(): void {
    this.listingForm.markAllAsTouched();
    if (this.listingForm.invalid || this.isCreating()) {
      return;
    }

    const value = this.listingForm.getRawValue();
    const request: CreateListingRequest = {
      title: value.title.trim(),
      description: value.description.trim(),
      price: {
        amountMinor: Math.round(value.priceEuros * 100),
        currency: 'EUR',
      },
      images: value.imageUrl.trim() ? [{ url: value.imageUrl.trim(), position: 0 }] : [],
    };

    this.isCreating.set(true);
    this.pageErrors.set([]);
    this.listingsService
      .create(request)
      .pipe(finalize(() => this.isCreating.set(false)))
      .subscribe({
        next: (listing) => {
          this.listings.update((current) => [listing, ...current]);
          this.listingForm.reset({
            title: '',
            description: '',
            priceEuros: 0,
            imageUrl: '',
          });
        },
        error: (error: unknown) => this.pageErrors.set(extractErrorMessages(error)),
      });
  }

  protected publishMock(listingId: string, category: string): void {
    const normalizedCategory = category.trim();
    if (!normalizedCategory || this.isListingBusy(listingId)) {
      return;
    }

    this.setListingBusy(listingId, true);
    this.pageErrors.set([]);
    this.publicationsService
      .publishMock(listingId, { category: normalizedCategory })
      .pipe(finalize(() => this.setListingBusy(listingId, false)))
      .subscribe({
        next: (result) => {
          this.publications.update((current) => ({
            ...current,
            [listingId]: [result.publication, ...(current[listingId] ?? [])],
          }));
          if (!result.success) {
            this.pageErrors.set(result.errors.map((error) => error.message));
          }
        },
        error: (error: unknown) => this.pageErrors.set(extractErrorMessages(error)),
      });
  }

  protected setCategory(listingId: string, event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }
    const category = event.target.value;
    this.categories.update((current) => ({
      ...current,
      [listingId]: category,
    }));
  }

  protected loadPublications(listingId: string): void {
    if (this.isListingBusy(listingId)) {
      return;
    }
    this.setListingBusy(listingId, true);
    this.publicationsService
      .findByListingId(listingId)
      .pipe(finalize(() => this.setListingBusy(listingId, false)))
      .subscribe({
        next: (publications) =>
          this.publications.update((current) => ({ ...current, [listingId]: publications })),
        error: (error: unknown) => this.pageErrors.set(extractErrorMessages(error)),
      });
  }

  protected removeListing(listingId: string): void {
    if (this.isListingBusy(listingId)) {
      return;
    }
    this.setListingBusy(listingId, true);
    this.listingsService
      .remove(listingId)
      .pipe(finalize(() => this.setListingBusy(listingId, false)))
      .subscribe({
        next: () => {
          this.listings.update((current) => current.filter(({ id }) => id !== listingId));
          this.publications.update((current) => {
            const { [listingId]: removed, ...remaining } = current;
            void removed;
            return remaining;
          });
        },
        error: (error: unknown) => this.pageErrors.set(extractErrorMessages(error)),
      });
  }

  protected startEditing(listing: ListingResponse): void {
    if (this.isListingBusy(listing.id)) {
      return;
    }
    this.pageErrors.set([]);
    this.editingListingId.set(listing.id);
    this.editListingForm.reset({
      title: listing.title,
      description: listing.description,
      priceEuros: listing.price.amountMinor / 100,
    });
  }

  protected cancelEditing(): void {
    this.editingListingId.set(null);
  }

  protected saveListing(listingId: string): void {
    this.editListingForm.markAllAsTouched();
    if (this.editListingForm.invalid || this.isListingBusy(listingId)) {
      return;
    }

    const value = this.editListingForm.getRawValue();
    this.setListingBusy(listingId, true);
    this.pageErrors.set([]);
    this.listingsService
      .update(listingId, {
        title: value.title.trim(),
        description: value.description.trim(),
        price: { amountMinor: Math.round(value.priceEuros * 100), currency: 'EUR' },
      })
      .pipe(finalize(() => this.setListingBusy(listingId, false)))
      .subscribe({
        next: (updatedListing) => {
          this.listings.update((current) =>
            current.map((listing) => (listing.id === listingId ? updatedListing : listing)),
          );
          this.editingListingId.set(null);
        },
        error: (error: unknown) => this.pageErrors.set(extractErrorMessages(error)),
      });
  }

  protected publicationStatusLabel(status: PublicationResponse['status']): string {
    const labels: Record<PublicationResponse['status'], string> = {
      draft: 'Bozza',
      validating: 'Validazione',
      ready: 'Pronto',
      publishing: 'Pubblicazione',
      published: 'Pubblicato',
      failed: 'Fallito',
    };
    return labels[status];
  }

  protected isListingBusy(listingId: string): boolean {
    return this.busyListingIds().has(listingId);
  }

  private checkBackend(): void {
    this.healthService.check().subscribe({
      next: (health) => this.health.set(health),
      error: () => this.health.set(null),
    });
  }

  private loadListings(): void {
    this.isLoadingListings.set(true);
    this.listingsService
      .findAll()
      .pipe(finalize(() => this.isLoadingListings.set(false)))
      .subscribe({
        next: (listings) => this.listings.set(listings),
        error: (error: unknown) => this.pageErrors.set(extractErrorMessages(error)),
      });
  }

  private setListingBusy(listingId: string, busy: boolean): void {
    this.busyListingIds.update((current) => {
      const updated = new Set(current);
      if (busy) {
        updated.add(listingId);
      } else {
        updated.delete(listingId);
      }
      return updated;
    });
  }
}

function extractErrorMessages(error: unknown): readonly string[] {
  if (!(error instanceof HttpErrorResponse) || !isRecord(error.error)) {
    return ['Operazione non riuscita. Riprova.'];
  }

  const structuredErrors = error.error['errors'];
  if (Array.isArray(structuredErrors)) {
    const messages = structuredErrors
      .map((item) => (isRecord(item) ? item['message'] : undefined))
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
