/**
 * @file src/modules/users/users.controller.ts
 * @description Controller handling user-related endpoints.
 */
import { Controller, Body, Post, Patch, UseGuards, Get, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Serialize } from 'src/interceptors/serialize.decorator';
import { UserProfileResponseDto } from './dtos/user-profile-response.dto';
import { CreateUserProfileDto } from './dtos/create-user-profile.dto';
import { UsersProfileService } from './users-profile.service';
import { AuthUserAccount } from '../auth/auth-user-account.entity';
import { UpdateUserProfileDto } from './dtos/update-user-profile.dto';

/**
 * @description Controller exposing routes related to user operations and management.
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
@Serialize(UserProfileResponseDto)
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly usersProfileService: UsersProfileService,
    ) {}

    @Post('profile')
    async createProfile(
        @Req() req: Request,
        @Body() dto: CreateUserProfileDto
    ) {
        return this.usersProfileService.createProfile(req.user!.sub, dto);
    }

    @Patch('profile')
    async updateProfile(
        @Req() req: Request,
        @Body() dto: UpdateUserProfileDto
    ) {
        return this.usersProfileService.updateProfile(req.user!.sub, dto);
    }

    @Get('profile')
    async getProfile(@Req() req: Request) {
        return this.usersProfileService.getProfile(req.user!.sub)
    }

}
