/**
 * @file src/modules/auth/guards/refresh-token.guard.ts
 * @description Guard verifying if the refresh token in the cookie corresponds to a valid and active session.
 */
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionsService } from 'src/modules/sessions/sessions.service';
import { Request } from 'express';
import { RefreshTokenPayload } from 'src/interfaces/jwt.payload';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly sessionsService: SessionsService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        const token = req.cookies['refreshToken'];
        if (!token) {
            throw new UnauthorizedException('Brak tokenu odświeżania');
        }

        const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
            secret: process.env.JWT_REFRESH_SECRET,
        }).catch(() => {
            throw new UnauthorizedException('Refresh token jest nieprawidłowy lub wygasł');
        });

        const sessionId = payload.uuid_session;
        if (!sessionId) {
            throw new UnauthorizedException('Brak uuid sesji w tokenie odświeżania');
        }

        const session = await this.sessionsService.findBySessionId(sessionId);
        if (!session || session.is_revoked || session.expiresAt < new Date()) {
            throw new UnauthorizedException('Sesja nieaktywna lub wygasła');
        }

        req.user = {
        sub:           payload.sub,
        email:         payload.email,
        role:          payload.role,
        uuid_session:  sessionId,
        };

        return true;
    }
}
