/**
 * @file src/modules/users/dtos/user-profile.dto.ts
 * @description A global DTO that will serve as a template for other DTOs e.g. create-user-profile, update-user-profile, etc.
 */
import { IsDateString, IsEnum, IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { PartialType } from "@nestjs/mapped-types";
import { Expose } from 'class-transformer';
import { UserScoutRank } from '../enums/user-scout-rank.enum';
import { UserScoutTeam } from '../enums/user-scout-team.enum';
import { UserTroopTeam } from '../enums/user-troop-team.enum';

export class UserProfileDto {

    @Expose()
    @IsUUID()
    uuid_profile: string;

    @Expose()
    @IsString({ message: 'First name must be a string' })
    @IsNotEmpty()
    firstname: string;

    @Expose()
    @IsString({ message: 'Last name must be a string' })
    @IsNotEmpty()
    lastname: string;

    @Expose()
    @IsDateString()
    @IsNotEmpty()
    dateOfBirth: string;

    @Expose()
    @IsString({ message: 'Phone number must be a string' })
    @IsNotEmpty()
    phoneNumber: string;

    @Expose()
    @IsDateString()
    @IsNotEmpty()
    startedScoutingAt: string;

    @Expose()
    @IsDateString()
    @IsNotEmpty()
    joinedZHRAt: string;

    @Expose()
    @IsDateString()
    @IsNotEmpty()
    oathDate: string;

    @Expose()
    @IsEnum(UserScoutRank, { message: 'Invalid scout rank' })
    @IsNotEmpty()
    scoutRank: UserScoutRank;

    @Expose()
    @IsDateString()
    @IsNotEmpty()
    scoutRankGrantedAt: string;

    @Expose()
    @IsIn(['Brak', 'Przewodnik'])
    @IsNotEmpty()
    scoutInstructorRank: 'Brak' | 'Przewodnik'

    @Expose()
    @IsEnum(UserScoutTeam, { message: 'Invalid scout team' })
    scoutTeam: UserScoutTeam;

    @Expose()
    @IsString()
    @IsNotEmpty()
    functionInScoutTeam: string;

    @Expose()
    @IsEnum(UserTroopTeam)
    @IsNotEmpty()
    scoutTroop: UserTroopTeam;

    @Expose()
    @IsString()
    @IsNotEmpty()
    functionInTroop: string;

    @Expose()
    @IsEnum(UserScoutRank)
    @IsNotEmpty()
    currentRankTarget: UserScoutRank;

    @Expose()
    @IsDateString()
    @IsNotEmpty()
    plannedEndDate: string;
}

export class CreateUserProfileDto extends UserProfileDto {}

export class UpdateUserProfileDto extends PartialType(UserProfileDto) {}

export class UserProfileResponseDto extends UserProfileDto {}