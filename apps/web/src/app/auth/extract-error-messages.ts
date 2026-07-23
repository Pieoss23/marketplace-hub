import { HttpErrorResponse } from '@angular/common/http';

export function extractErrorMessages(error: unknown): readonly string[] {
  if (!(error instanceof HttpErrorResponse) || !isRecord(error.error)) {
    return ['Operazione non riuscita. Riprova.'];
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
