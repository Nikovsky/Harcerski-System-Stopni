/**
 * @file src/modules/auth/auth.controller.ts
 * @description Controller handling authentication endpoints.
 */
import { Post, Body, Controller, Req, Res, UseGuards, Get, Param } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Serialize } from 'src/interceptors/serialize.decorator';
import { Request, Response } from 'express';
import { LoginUserAccountDto, RegisterUserAccountDto } from './dtos/auth-user-account.dto';
import { AuthService } from './auth.service';
import { Roles } from './decorator/roles.decorator';
import { RolesGuard } from './guards/role.guard';
import { UserRole } from './enums/auth-user-role.enum';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { LoginUserResponseDto } from './dtos/login-user-response.dto';
import { RegisterUserResponseDto } from './dtos/register-user-response.dto';

/**
 * @description Controller exposing authentication-related routes such as login, logout, registration, token refresh, and session management.
 */
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService
    ) {}

    /**
     * @description Registers a new user account with provided credentials.
     * @param dto - Data Transfer Object containing user registration data.
     * @returns Confirmation of successful registration.
     */
    @Post('register')
    @Serialize(RegisterUserResponseDto)
    signup(@Body() dto: RegisterUserAccountDto) {
        return this.authService.register(dto)
    }

    /**
     * @description Authenticates a user and issues access and refresh tokens.
     * @param dto - Data Transfer Object containing user login credentials.
     * @param req - HTTP request object.
     * @param res - HTTP response object for setting cookies.
     * @returns Authentication result and tokens.
     */
    @Post('login')
    @Serialize(LoginUserResponseDto)
    async login(
        @Body() dto: LoginUserAccountDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        const { accessToken, refreshToken, expiresAt, user } = await this.authService.login(dto, req);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return { accessToken, expiresAt, user };
    }

    /**
     * @description Logs out the currently authenticated user and revokes their session.
     * @param req - HTTP request object.
     * @param res - HTTP response object for clearing cookies.
     * @returns Confirmation of successful logout.
     */
    @UseGuards(RefreshTokenGuard)
    @Post('logout')
    async logout(@Req() req: Request, @Res( {passthrough: true}) res: Response) {
        const result = await this.authService.logout(req);

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/',
        });

        return result;
    }

    /**
     * @description Refreshes the access token using a valid refresh token.
     * @param req - HTTP request containing the refresh token cookie.
     * @returns New access token.
     */
    @UseGuards(RefreshTokenGuard)
    @Post('refresh')
    async refresh(@Req() req: Request,  @Res({ passthrough: true }) res: Response) {
        const { refreshToken, accessToken, expiresAt } = await this.authService.refresh(req);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dni
        });

        return { accessToken, expiresAt };
    }

    /**
     * @description Retrieves all sessions associated with the authenticated user.
     * @param req - HTTP request object with user identity.
     * @returns List of user sessions.
     */
    @UseGuards(JwtAuthGuard)
    @Get('sessions')
    async getSessions(@Req() req: Request) {
        return this.authService.getSessions(req);
    }

    /**
     * @description Revokes a specific session belonging to the authenticated user.
     * @param id - UUID of the session to revoke.
     * @param req - HTTP request object with user identity.
     * @returns Confirmation of successful revocation.
     */
    @Post('sessions/:id/revoke')
    @UseGuards(JwtAuthGuard)
    async revokeSession(@Param('id') id: string, @Req() req: Request) {
        return this.authService.revokeSession(req, id);
    }

    /**
     * @description Logs out the user from all other sessions except (optionally) the current one.
     * @param req - HTTP request object with user identity.
     * @param includeCurrent - Whether to also revoke the current session.
     * @returns Confirmation of session revocations.
     */
    @Post('logout-other')
    @UseGuards(JwtAuthGuard)
    async logoutOther(
        @Req() req: Request,
        @Body('includeCurrent') includeCurrent: boolean,
    ) {

        return this.authService.logoutOther(req, includeCurrent);
    }

    @Get('admin')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    getAdminData() {
        return "Tylko dla adminów!";
    }
}
