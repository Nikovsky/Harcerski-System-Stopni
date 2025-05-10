/**
 * @file src/modules/auth/dtos/auth-user-account.dto.ts
 * @description A global DTO that will serve as a template for other DTOs e.g. create-user-account, update-user-account, etc.
 */
import {IsEmail, IsEnum, IsIn, IsOptional, IsString, MinLength} from 'class-validator';
import { UserRole } from '../enums/auth-user-role.enum';
import { PickType, PartialType } from '@nestjs/mapped-types';

export class AuthUserAccountDto {
    @IsEmail({}, {message: 'Invalid email address'})
    email: string;

    @IsOptional()
    @IsString({message: 'Password must be a string'})
    @MinLength(8, {message: 'Password must be at least 8 characters long'})
    password?: string;

    @IsOptional()
    @IsIn(['local', 'google'])
    provider?: 'local' | 'google'

    @IsEnum(UserRole)
    role: UserRole;
}

export class RegisterUserAccountDto extends PickType(AuthUserAccountDto, ['email', 'password'] as const) {}

export class LoginUserAccountDto extends PickType(AuthUserAccountDto, ['email', 'password'] as const) {}

export class UpdateUserAccountDto extends PartialType(AuthUserAccountDto) {}