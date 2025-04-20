/**
 * @file src/modules/auth/auth.services.ts
 * @description Service handling authentication logic (login, register, logout).
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from "argon2";
import { UsersService } from '../users/users.service';
import { CreateUserAccountDto } from './dtos/create-user-account.dto';

@Injectable()
export class AuthService {
    constructor(private readonly usersService: UsersService) {}

    async signup(dto: CreateUserAccountDto) {
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
}
