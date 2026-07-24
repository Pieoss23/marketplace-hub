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

  static invalidRefreshToken(): AuthApiException {
    return new AuthApiException(HttpStatus.UNAUTHORIZED, {
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Invalid or expired refresh token.',
    });
  }

  static refreshTokenReused(): AuthApiException {
    return new AuthApiException(HttpStatus.UNAUTHORIZED, {
      code: 'REFRESH_TOKEN_REUSED',
      message:
        'This refresh token was already used. All sessions for this account have been revoked; please log in again.',
    });
  }
}
