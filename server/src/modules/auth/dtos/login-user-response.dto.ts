/**
 * @file src/modules/auth/dtos/auth-user-response.dto.ts
 * @description DTO for the response of the authenticated user. This DTO is used to return the user information after authentication.
 */
import { Exclude, Expose, Type } from 'class-transformer';
import { UserRole } from '../enums/auth-user-role.enum';

@Exclude()
export class UserInfoDto {
    @Expose()
    uuid_user: string;
    
    @Expose()
    email: string;

    @Expose()
    role: UserRole;
}

@Exclude()
export class LoginUserResponseDto {

    @Expose()
    accessToken: string;

    @Expose()
    expiresAt: string;

    @Expose()
    @Type(() => UserInfoDto)
    user: UserInfoDto;
}