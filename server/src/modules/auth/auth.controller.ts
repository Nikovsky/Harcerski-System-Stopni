/**
 * @file src/modules/auth/auth.controller.ts
 * @description Controller handling authentication endpoints.
 */
import { Post, Body, Controller, Req, Res, UseGuards, Get, Param } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { Request, Response } from 'express';
import { RegisterUserAccountDto } from './dtos/register-user-account.dto';
import { AuthService } from './auth.service';
import { LoginUserAccountDto } from './dtos/login-user-account.dto';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService
    ) {}

    @Post('register')
    signup(@Body() dto: RegisterUserAccountDto) {
        return this.authService.register(dto)
    }

    @Post('login')
    login(
        @Body() dto: LoginUserAccountDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        return this.authService.login(dto, req, res);
    }

    @Post('logout')
    logout(@Req() req: Request, @Res( {passthrough: true}) res: Response) {
        return this.authService.logout(req, res);
    }

    @Post('refresh')
    refresh(@Req() req: Request) {
        return this.authService.refresh(req);
    }

    @Get('sessions')
    @UseGuards(JwtAuthGuard)
    async getSessions(@Req() req: Request) {
        return this.authService.getSessions(req);
    }

    @Post('sessions/:id/revoke')
    @UseGuards(JwtAuthGuard)
    async revokeSession(@Param('id') id: string, @Req() req: Request) {
        return this.authService.revokeSession(req, id);
    }

    @Post('logout-other')
    @UseGuards(JwtAuthGuard)
    async logoutOther(
        @Req() req: Request,
        @Body('includeCurrent') includeCurrent: boolean,
    ) {
        console.log('includeCurrent z requesta:', includeCurrent);
        return this.authService.logoutOther(req, includeCurrent);
    }
}
