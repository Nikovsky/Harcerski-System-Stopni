// @file: apps/api/src/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthPrincipal } from '@hss/schemas';

type RequestWithUser = {
  user?: AuthPrincipal;
};

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<RequestWithUser>().user,
);
