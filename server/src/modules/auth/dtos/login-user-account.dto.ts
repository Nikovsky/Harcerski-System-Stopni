/**
 * @file src/modules/auth/dtos/create--user-account.dto.ts
 * @description DTO, using user-account.dto.ts to verify user registration.
 */
import { PickType } from '@nestjs/mapped-types';
import { AuthUserAccountDto } from './auth-user-account.dto';

export class LoginUserAccountDto extends PickType(AuthUserAccountDto, ['email', 'password'] as const) {}