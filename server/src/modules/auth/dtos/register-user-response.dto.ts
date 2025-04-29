/**
 * @file src/modules/auth/dtos/auth-user-response.dto.ts
 * @description DTO for the response of the authenticated user. This DTO is used to return the user information after authentication.
 */
import { Exclude, Expose } from 'class-transformer';
import { UserRole } from '../enums/auth-user-role.enum';

@Exclude()
export class RegisterUserResponseDto {

    @Expose()
    uuid_account: string;

    @Expose()
    email: string;

    @Expose()
    role: UserRole
}