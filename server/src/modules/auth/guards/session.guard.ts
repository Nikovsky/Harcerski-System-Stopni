/**
 * @file src/modules/auth/guards/session.guard.ts
 * @description Guard verifying if the refresh token corresponds to a valid and active session.
 */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { SessionsService } from 'src/modules/sessions/sessions.service';
import { RefreshTokenPayload } from 'src/interfaces/jwt.payload';

/**
 * @description Guard responsible for validating user sessions based on the refresh token stored in cookies.
 */
@Injectable()
export class SessionGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly sessionsService: SessionsService,
    ) {}
    
    /**
    * @description Checks if the incoming request has a valid, non-revoked, and non-expired session based on the refresh token.
    * @param context - Execution context providing access to the HTTP request.
    * @returns Promise resolving to true if the session is valid, otherwise throws UnauthorizedException.
    */

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = request.cookies['refreshToken']

        if (!token) {
            throw new UnauthorizedException('Brak tokenu odświeżania');
        }

        const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
            secret: process.env.JWT_REFRESH_SECRET,
        }).catch(() => {
            throw new UnauthorizedException('Refresh token jest niepoprawny lub wygasł!');
        });

        const sessionId = payload?.uuid_session
        if (!sessionId) {
            throw new UnauthorizedException('Brak uuid sesji w tokenie odświeżania!');
        }

        const session = await this.sessionsService.findBySessionId(sessionId);
        if (!session || session.is_revoked || session.expiresAt < new Date()) {
            throw new UnauthorizedException('Sesja nieaktywna lub wygasła')
        }

        request.user = {
            sub: session.user.uuid_account,
            email: session.user.email,
            role: session.user.role,
        };

        return true;
    }
}
