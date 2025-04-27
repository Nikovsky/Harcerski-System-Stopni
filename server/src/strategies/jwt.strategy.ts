/**
 * @file src/strategies/jwt.strategy.ts
 * @description Strategy handling JWT validation for protected routes.
 */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenPayload } from 'src/interfaces/jwt.payload';

/**
 * @description JWT strategy for extracting and validating access tokens from Authorization headers.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
constructor() {
super({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    ignoreExpiration: false,
    secretOrKey: process.env.JWT_SECRET,
});
}

    /**
     * @description Validates the payload extracted from the JWT token.
     * @param payload - Decoded JWT payload containing user information.
     * @returns Object containing user identity fields (sub, email, role) to be attached to the request.
     */
    async validate(payload: AccessTokenPayload): Promise<AccessTokenPayload> {
        return payload;
    }
}
