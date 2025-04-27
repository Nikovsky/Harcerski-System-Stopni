/**
 * @file src/modules/auth/auth.services.ts
 * @description Service handling authentication logic (login, register, logout).
 */
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from "argon2";
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';
import { UsersService } from '../users/users.service';
import { RegisterUserAccountDto } from './dtos/register-user-account.dto';
import { LoginUserAccountDto } from './dtos/login-user-account.dto';
import { JwtPayload, RefreshTokenPayload } from 'src/interfaces/jwt.payload';
import { SessionsService } from '../sessions/sessions.service';

/**
 * @description Service providing methods for user registration, authentication, token management, and session handling.
 */
@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly sessionService: SessionsService,
    ) {}

    /**
     * @description Registers a new user account after validating the email and hashing the password.
     * @param dto - Data Transfer Object containing registration details.
     * @returns Created user entity.
     */
    async register(dto: RegisterUserAccountDto) {
        const users = await this.usersService.findOneByEmail(dto.email);

        if (users) {
            throw new BadRequestException("Email jest już w użyciu!")
        }

        let hashedPassword: string | undefined = undefined;

        if (dto.password) {
        hashedPassword = await argon2.hash(dto.password)
        }

        return this.usersService.create({
            ...dto,
            password: hashedPassword
        })
    }

    /**
     * @description Authenticates a user and issues access and refresh tokens. Creates a new session record.
     * @param dto - Data Transfer Object containing login credentials.
     * @param req - HTTP request object for extracting IP and user agent.
     * @param res - HTTP response object for setting the refresh token cookie.
     * @returns Object containing the access token, expiration time, and user information.
     */
    async login(dto: LoginUserAccountDto, req: Request, res: Response) {
        const user = await this.usersService.findOneByEmail(dto.email);

        if (!user || !user.password || !dto.password || !(await argon2.verify(user.password, dto.password))) {
            throw new UnauthorizedException('Nieprawidłowy email lub hasło');
        }

        await this.sessionService.limitActiveSessions(user.uuid_account);
        
        const uuidSession = uuidv4();

        const accessToken = await this.jwtService.signAsync(
            {
                sub: user.uuid_account,
                email: user.email,
                role: user.role,
                uuid_session: uuidSession,
            } as JwtPayload & { uuid_session: string },
            {
                secret: process.env.JWT_SECRET,
                expiresIn: process.env.JWT_SECRET_EXPIRES_IN || '15m',
            },
        );


        const refreshToken = await this.jwtService.signAsync(
            {
                sub: user.uuid_account,
                email: user.email,
                role: user.role,
                uuid_session: uuidSession,
            } as RefreshTokenPayload,
            {
                secret: process.env.JWT_REFRESH_SECRET,
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
            },
        );

        await this.sessionService.createSession({
            uuid_session: uuidSession,
            user_id: user.uuid_account,
            ipAddress: req.ip || '',
            userAgent: req.headers['user-agent'] || '',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 ),
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return {
            accessToken,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            user: {
                uuid_user: user.uuid_account,
                email: user.email,
                role: user.role,
            },
        };
    }

    /**
     * @description Issues a new access token based on a valid refresh token stored in cookies.
     * @param req - HTTP request containing the refresh token.
     * @returns Object containing the new access token.
     */
    async refresh(req: Request, res: Response) {
        const token = req.cookies['refreshToken'];
        if (!token) throw new UnauthorizedException('Brak refreshToken');

        const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
            secret: process.env.JWT_REFRESH_SECRET,
        }).catch(() => {
            throw new UnauthorizedException('Refresh token jest niepoprawny lub wygasł!');
        });

        const { uuid_session: oldSessionId, sub: userId } = payload;

        const session = await this.sessionService.findBySessionId(oldSessionId);
        if (!session || session.is_revoked || !session.user) {
            throw new UnauthorizedException('Sesja nie została znaleziona lub została unieważniona');
        }
        
        if (session.expiresAt < new Date()) {
            throw new UnauthorizedException('Sesja wygasła. Zaloguj się ponownie.');
        }

        await this.sessionService.revokeSession(oldSessionId, userId);

        const newSessionId = uuidv4();
        const newRefreshToken = await this.jwtService.signAsync(
            {
                sub: userId,
                email: session.user.email,
                role: session.user.role,
                uuid_session: newSessionId,
            },
            {
                secret: process.env.JWT_REFRESH_SECRET,
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
            },
        );

        await this.sessionService.createSession({
            uuid_session: newSessionId,
            user_id: userId,
            ipAddress: req.ip || '',
            userAgent: req.headers['user-agent'] || '',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dni
        });

        const newAccessToken = await this.jwtService.signAsync(
            {
                sub: session.user.uuid_account,
                email: session.user.email,
                role: session.user.role,
                uuid_session: newSessionId,
            } as JwtPayload & { uuid_session: string },
            {
                secret: process.env.JWT_SECRET,
                expiresIn: process.env.JWT_SECRET_EXPIRES_IN || '15m',
            },
        );
        return {
            access_token: newAccessToken,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        };
    }

    /**
     * @description Revokes a specific user session by its session ID.
     * @param req - HTTP request containing user identity.
     * @param sessionId - UUID of the session to be revoked.
     * @returns Confirmation of session revocation.
     */
    async revokeSession(req: Request, sessionId: string) {
        return this.sessionService.revokeSession(sessionId, (req.user as JwtPayload).sub);
    }

    /**
     * @description Logs out the user by revoking their current session and clearing the refresh token cookie.
     * @param req - HTTP request containing the refresh token.
     * @param res - HTTP response object to clear the cookie.
     * @returns Confirmation message.
     */
    async logout(req: Request, res: Response) {
        const token = req.cookies['refreshToken'];
        if (!token) {
            throw new UnauthorizedException('Brak tokena odświeżania.');
        }
    
        let payload: RefreshTokenPayload;
        try {
            payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_REFRESH_SECRET,
});
        } catch (error) {
            throw new UnauthorizedException('Nieprawidłowy lub wygasły token odświeżania.');
        }
    
        const userId = payload?.sub;
        const sessionId = payload?.uuid_session;
    
        if (!sessionId || !userId) {
            throw new UnauthorizedException('Nieprawidłowe dane w tokenie odświeżania.');
        }
    
        await this.sessionService.revokeSession(sessionId, userId);
    
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/',
        });
    
        return { message: 'Wylogowano pomyślnie' };
    }

    /**
     * @description Logs the user out of all sessions, optionally including the current one.
     * @param req - HTTP request containing user identity.
     * @param includeCurrent - Whether to include the current session in the revocation.
     * @returns Confirmation message of sessions revocation.
     */
    async logoutOther(req: Request, includeCurrent: boolean) {
        const userId = (req.user as { sub: string }).sub;

        if (includeCurrent) {
            await this.sessionService.revokeAllByUser(userId);
        } else {
            const sessions = await this.sessionService.getSessionsForUser(userId);
            const current = sessions.find((s) => !s.revoked);
            if (!current) {
                throw new UnauthorizedException('Brak aktywnej sesji');
            }
            await this.sessionService.revokeAllExcept(current.id, userId);
        }

        return {
            message: includeCurrent
            ? 'Wylogowano ze wszystkich sesji'
            : 'Wylogowano z pozostałych sesji',
        };
    }  

    /**
     * @description Retrieves all active and historical sessions for the authenticated user.
     * @param req - HTTP request containing user identity.
     * @returns List of user sessions.
     */
    async getSessions(req: Request) {
        return this.sessionService.getSessionsForUser((req.user as JwtPayload).sub);
    }
}
