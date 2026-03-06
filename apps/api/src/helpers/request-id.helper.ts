// @file: apps/api/src/helpers/request-id.helper.ts
import type { Request } from 'express';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export function sanitizeRequestId(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed || !REQUEST_ID_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function extractRequestId(req: Pick<Request, 'headers'>): string | null {
  const headerValue = req.headers['x-request-id'];
  const requestId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return typeof requestId === 'string' ? sanitizeRequestId(requestId) : null;
}
