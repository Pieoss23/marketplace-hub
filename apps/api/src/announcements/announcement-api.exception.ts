import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorResponse } from '@marketplace-hub/contracts';
import type { ValidationIssue } from '@marketplace-hub/domain';

export class AnnouncementApiException extends HttpException {
  constructor(status: HttpStatus, body: ApiErrorResponse) {
    super(body, status);
  }

  static notFound(code: string, message: string): AnnouncementApiException {
    return new AnnouncementApiException(HttpStatus.NOT_FOUND, { code, message });
  }

  static conflict(code: string, message: string): AnnouncementApiException {
    return new AnnouncementApiException(HttpStatus.CONFLICT, { code, message });
  }

  static validationFailed(issues: readonly ValidationIssue[]): AnnouncementApiException {
    return new AnnouncementApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
      code: 'VALIDATION_FAILED',
      message: 'One or more validation rules failed.',
      field: issues[0]?.field,
      details: issues,
    });
  }
}
