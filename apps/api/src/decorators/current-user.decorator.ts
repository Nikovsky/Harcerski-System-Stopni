// @file: apps/api/src/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthPrincipal } from '@hss/schemas';

type AuthenticatedRequest = Request & {
  user?: AuthPrincipal;
};

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthPrincipal | undefined => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return req.user;
  },
);

