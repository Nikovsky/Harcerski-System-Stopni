/**
 * @file src/modules/auth/auth.services.ts
 * @description Service handling authentication logic (login, register, logout).
 */
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from "argon2";
import { Repository } from 'typeorm';
import { Request, Response } from 'express';
import { UsersService } from '../users/users.service';
import { RegisterUserAccountDto } from './dtos/register-user-account.dto';
import { LoginUserAccountDto } from './dtos/login-user-account.dto';
import { JwtPayload } from 'src/interfaces/jwt.payload';
import { SessionsService } from '../sessions/sessions.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly sessionService: SessionsService,
    ) {}

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

    async login(dto: LoginUserAccountDto, req: Request, res: Response) {
        const user = await this.usersService.findOneByEmail(dto.email);

        if (!user || !user.password || !dto.password || !(await argon2.verify(user.password, dto.password))) {
            throw new UnauthorizedException('Nieprawidłowy email lub hasło');
        }

        const payload = {
            sub: user.uuid_account,
            email: user.email,
            role: user.role,
        };

        const accessToken = await this.jwtService.sign(payload, {
            secret: process.env.JWT_SECRET,
            expiresIn: process.env.JWT_SECRET_EXPIRES_IN || '15m',
        });

        const refreshToken = await this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        });

        // Zapis do baz danych sesji
        const userAgent = (req.headers['user-agent'] ?? '') as string;
        const ipAddress = req.ip ?? '';

        await this.sessionService.createSession(refreshToken, user, ipAddress, req.headers['user-agent'] || '');

        // Ustaw cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dni
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

    async refresh(req: Request) {
        const token = req.cookies['refreshToken'];
        if (!token) throw new UnauthorizedException('Brak refreshToken');

        let payload: any;
        try {
            payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_REFRESH_SECRET,
            });
        } catch (err) {
            throw new UnauthorizedException('Refresh token jest niepoprawny lub wygasł!');
        }

        const session = await this.sessionService.findByRefreshToken(token);
        if (!session || session.is_revoked || !session.user) {
            throw new UnauthorizedException('Sesja nie została znaleziona lub została unieważniona');
        }
        

        const newAccessToken = await this.jwtService.signAsync(
            {
                sub: session.user.uuid_account,
                email: session.user.email,
                role: session.user.role,
            },
            {
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '15m',
            },
        );
        return { access_token: newAccessToken };
    }

    async revokeSession(req: Request, sessionId: string) {
        return this.sessionService.revokeSession(sessionId, (req.user as JwtPayload).sub);
    }

    async logout(req: Request, res: Response) {
        const token = req.cookies['refreshToken'];
        if (!token) return;

        await this.sessionService.revokeByToken(token);
        res.clearCookie('refreshToken');
        return { message: 'Wylogowano pomyślnie' };
    }

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

    async getSessions(req: Request) {
        return this.sessionService.getSessionsForUser((req.user as JwtPayload).sub);
    }
}
