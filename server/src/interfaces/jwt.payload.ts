/**
 * @file src/interfacs/jwt.payload.ts
 * @description JWT payload interface for authentication using Passport and JWT.
 */
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}
