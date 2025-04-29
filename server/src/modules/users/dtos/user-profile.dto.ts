/**
 * @file src/modules/users/dtos/user-profile.dto.ts
 * @description A global DTO that will serve as a template for other DTOs e.g. create-user-profile, update-user-profile, etc.
 */
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { UserScoutRank } from '../enums/user-scout-rank.enum';
import { UserScoutTeam } from '../enums/user-scout-team.enum';

export class UserProfileDto {
    @IsString({ message: 'First name must be a string' })
    firstname: string;

    @IsString({ message: 'Last name must be a string' })
    lastname: string;

    @IsEnum(UserScoutRank, { message: 'Invalid scout rank' })
    scoutRank?: UserScoutRank;

    @IsIn(['Brak', 'Przewodnik'])
    scoutInstructorRank?: 'Brak' | 'Przewodnik'

    @IsEnum(UserScoutTeam, { message: 'Invalid scout team' })
    scoutTeam?: UserScoutTeam;
}