import { Controller, Get, Req } from '@nestjs/common';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthPrincipal } from './types';
import { AuthService } from './auth.service';
import type { Request } from 'express';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  async me(
    @CurrentUser() user: AuthPrincipal,
    @Req() req: Request & { requestId?: string },
  ) {
    const dbUser = await this.auth.upsertUserFromToken(user);

    await this.auth.auditMeAccess(dbUser.id, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return {
      principal: {
        sub: user.sub,
        email: user.email,
        displayName: user.displayName,
        azp: user.azp,
        roles: user.roles,
      },
      user: dbUser,
    };
  }
}
