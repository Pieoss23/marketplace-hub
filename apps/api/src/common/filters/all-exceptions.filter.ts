import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
  errors?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const structuredErrors = isHttpException ? this.extractStructuredErrors(exception) : undefined;

    const body: ErrorResponseBody = {
      statusCode,
      message: isHttpException ? this.extractMessage(exception) : 'Internal server error',
      error: isHttpException ? exception.name : 'InternalServerError',
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(structuredErrors !== undefined && { errors: structuredErrors }),
    };

    if (!isHttpException) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(statusCode).json(body);
  }

  private extractMessage(exception: HttpException): string | string[] {
    const response = exception.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    const message = (response as { message?: string | string[] }).message;
    return message ?? exception.message;
  }

  private extractStructuredErrors(exception: HttpException): unknown {
    const response = exception.getResponse();
    if (typeof response === 'object' && response !== null && 'errors' in response) {
      return (response as { errors?: unknown }).errors;
    }
    return undefined;
  }
}
