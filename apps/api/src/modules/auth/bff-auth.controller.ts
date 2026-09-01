// @file: apps/api/src/modules/auth/bff-auth.controller.ts
import {
  Body,
  Controller,
  Get,
  Headers as RequestHeader,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { bffSessionTouchRequestSchema } from '@hss/schemas';

import { Public } from '@/decorators/public.decorator';
import { BetterAuthService } from './better-auth.service';
import { BffSecretService } from './bff-secret.service';

function toWebHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }
  return headers;
}

@Public()
@Controller('internal/bff/auth')
export class BffAuthController {
  constructor(
    private readonly betterAuth: BetterAuthService,
    private readonly bffSecret: BffSecretService,
  ) {}

  private assertBff(secret: string | undefined): void {
    if (this.bffSecret.isValid(secret)) return;
    throw new UnauthorizedException({
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication required.',
    });
  }

  @Get('session')
  async getSession(
    @Req() request: Request,
    @RequestHeader('x-hss-bff-secret') secret?: string,
  ) {
    this.assertBff(secret);
    return { session: await this.betterAuth.getSession(toWebHeaders(request)) };
  }

  @Post('touch')
  async touchSession(
    @Req() request: Request,
    @Body() body: unknown,
    @RequestHeader('x-hss-bff-secret') secret?: string,
  ) {
    this.assertBff(secret);
    const parsed = bffSessionTouchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return { session: null, invalidRequest: true };
    }
    return {
      session: await this.betterAuth.touchSession(
        toWebHeaders(request),
        parsed.data.extendSeconds,
      ),
      invalidRequest: false,
    };
  }
}
