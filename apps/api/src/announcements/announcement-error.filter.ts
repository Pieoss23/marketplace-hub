import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorResponse } from '@marketplace-hub/contracts';

/**
 * Scoped to the announcements controller via `@UseFilters`, so it never
 * changes the response shape of the existing Listing/Publication feature
 * (which relies on the global `AllExceptionsFilter`). Produces the frozen
 * `ApiErrorResponse` shape from `docs/api/announcement-publication-api.md`.
 */
@Catch()
export class AnnouncementErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response
        .status(status)
        .json(isApiErrorResponse(body) ? body : toApiErrorResponse(status, body));
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    } satisfies ApiErrorResponse);
  }
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return typeof value === 'object' && value !== null && 'code' in value && 'message' in value;
}

function toApiErrorResponse(status: number, body: unknown): ApiErrorResponse {
  const message = extractMessage(body);
  const isValidation = status === HttpStatus.BAD_REQUEST;
  return {
    code: isValidation ? 'VALIDATION_FAILED' : 'ERROR',
    message: Array.isArray(message) ? message.join(' ') : (message ?? 'Unexpected error.'),
    ...(Array.isArray(message) && { details: message }),
  };
}

function extractMessage(body: unknown): string | string[] | undefined {
  if (typeof body === 'string') {
    return body;
  }
  if (typeof body === 'object' && body !== null && 'message' in body) {
    return (body as { message?: string | string[] }).message;
  }
  return undefined;
}
