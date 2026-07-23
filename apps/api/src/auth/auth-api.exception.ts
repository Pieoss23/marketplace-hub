import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorResponse } from '@marketplace-hub/contracts';

export class AuthApiException extends HttpException {
  constructor(status: HttpStatus, body: ApiErrorResponse) {
    super(body, status);
  }

  static emailAlreadyRegistered(): AuthApiException {
    return new AuthApiException(HttpStatus.CONFLICT, {
      code: 'EMAIL_ALREADY_REGISTERED',
      message: 'An account with this email already exists.',
      field: 'email',
    });
  }

  static invalidCredentials(): AuthApiException {
    return new AuthApiException(HttpStatus.UNAUTHORIZED, {
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    });
  }

  static missingToken(): AuthApiException {
    return new AuthApiException(HttpStatus.UNAUTHORIZED, {
      code: 'AUTH_TOKEN_MISSING',
      message: 'Authentication required.',
    });
  }

  static invalidToken(): AuthApiException {
    return new AuthApiException(HttpStatus.UNAUTHORIZED, {
      code: 'AUTH_TOKEN_INVALID',
      message: 'Invalid or expired session.',
    });
  }
}
