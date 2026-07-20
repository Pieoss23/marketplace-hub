import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from '@marketplace-hub/domain';

export class ListingValidationException extends BadRequestException {
  constructor(errors: readonly ValidationError[]) {
    super({
      message: errors.map((error) => `${error.field}: ${error.message}`),
      errors,
    });
  }
}
