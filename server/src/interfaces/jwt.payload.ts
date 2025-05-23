/**
 * @file src/interfacs/jwt.payload.ts
 * @description JWT payload interface for authentication using Passport and JWT.
 */
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}

export interface AccessTokenPayload extends JwtPayload {
    uuid_session: string;
}

export interface RefreshTokenPayload extends AccessTokenPayload {
    
}