/**
 * @file src/strategies/jwt.strategy.ts
 * @description Strategy handling JWT validation for protected routes, including session check.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy }                from '@nestjs/passport';
import { ExtractJwt, Strategy }            from 'passport-jwt';
import { ConfigService }                   from '@nestjs/config';
import { SessionsService }                 from 'src/modules/sessions/sessions.service';
import { AccessTokenPayload }              from 'src/interfaces/jwt.payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private readonly configService: ConfigService,
        private readonly sessionsService: SessionsService,
    ) {
    super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey:      configService.get<string>('JWT_SECRET'),
    });
}

/**
 * @description Validates the payload extracted from the JWT token and verifies the session is active.
 * @param payload - Decoded JWT payload containing user information and session UUID.
 * @returns Object containing user identity fields to be attached to the request.
 * @throws UnauthorizedException if session UUID is missing or session is revoked/expired.
 */
    async validate(payload: AccessTokenPayload): Promise<AccessTokenPayload> {
        const sessionId = payload.uuid_session;
        if (!sessionId) {
            throw new UnauthorizedException('Brak identyfikatora sesji w tokenie.');
        }

        const session = await this.sessionsService.findBySessionId(sessionId);
        if (!session || session.is_revoked || session.expiresAt < new Date()) {
            throw new UnauthorizedException('Sesja nieaktywna lub wygasła.');
        }

        return {
        sub:           payload.sub,
        email:         payload.email,
        role:          payload.role,
        uuid_session:  sessionId,
        };
    }
}
