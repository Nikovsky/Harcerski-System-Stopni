/**
 * @file src/modules/auth/auth.controller.ts
 * @description Controller handling authentication endpoints.
 */
import { Post, Body, Controller } from '@nestjs/common';
import { CreateUserAccountDto } from './dtos/create-user-account.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService
    ) {}

    @Post('signup')
    signup(@Body() dto: CreateUserAccountDto) {
        return this.authService.signup(dto)
    }
}
