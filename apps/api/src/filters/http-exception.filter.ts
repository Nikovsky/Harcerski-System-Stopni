// @file: apps/api/src/filters/http-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type HttpErrorBody = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
};

type NormalizedError = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
};

const STATUS_BAD_REQUEST = 400;
const STATUS_UNAUTHORIZED = 401;
const STATUS_FORBIDDEN = 403;
const STATUS_NOT_FOUND = 404;
const STATUS_INTERNAL_SERVER_ERROR = 500;

type ResponseWithRequestId = Response & {
  locals: Response['locals'] & {
    requestId?: string;
  };
};

function defaultCodeForStatus(status: number): string {
  if (status === STATUS_UNAUTHORIZED) return 'AUTHENTICATION_REQUIRED';
  if (status === STATUS_FORBIDDEN) return 'FORBIDDEN';
  if (status === STATUS_BAD_REQUEST) return 'BAD_REQUEST';
  if (status === STATUS_NOT_FOUND) return 'NOT_FOUND';
  return `HTTP_${status}`;
}

function defaultMessageForStatus(status: number): string {
  if (status >= STATUS_INTERNAL_SERVER_ERROR) return 'Internal server error.';
  if (status === STATUS_UNAUTHORIZED) return 'Authentication required.';
  if (status === STATUS_FORBIDDEN) return 'Forbidden.';
  if (status === STATUS_BAD_REQUEST) return 'Bad request.';
  if (status === STATUS_NOT_FOUND) return 'Not found.';
  return 'Request failed.';
}

function requestIdFromRequest(
  req: Request,
  res: ResponseWithRequestId,
): string | undefined {
  const header = req.headers['x-request-id'];
  if (Array.isArray(header)) return header[0];
  if (typeof header === 'string') return header;
  return res.locals?.requestId;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<ResponseWithRequestId>();
    const requestId = requestIdFromRequest(req, res);
    const normalized = this.normalizeException(exception);

    if (normalized.status >= STATUS_INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${normalized.code} requestId=${requestId ?? 'n/a'}`,
        normalized.stack,
      );
    }

    res.status(normalized.status).json({
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details !== undefined
        ? { details: normalized.details }
        : {}),
      ...(requestId ? { requestId } : {}),
    });
  }

  private normalizeException(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      if (typeof raw === 'string') {
        return {
          status,
          code: defaultCodeForStatus(status),
          message: raw,
          ...(status >= 500 ? { stack: exception.stack } : {}),
        };
      }

      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const body = raw as HttpErrorBody;
        const code =
          typeof body.code === 'string' && body.code.length > 0
            ? body.code
            : defaultCodeForStatus(status);
        const message =
          typeof body.message === 'string' && body.message.length > 0
            ? body.message
            : defaultMessageForStatus(status);

        return {
          status,
          code,
          message,
          ...(status < 500 && body.details !== undefined
            ? { details: body.details }
            : {}),
          ...(status >= 500 ? { stack: exception.stack } : {}),
        };
      }

      return {
        status,
        code: defaultCodeForStatus(status),
        message: defaultMessageForStatus(status),
        ...(status >= 500 ? { stack: exception.stack } : {}),
      };
    }

    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error.',
        stack: exception.stack,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error.',
    };
  }
}
