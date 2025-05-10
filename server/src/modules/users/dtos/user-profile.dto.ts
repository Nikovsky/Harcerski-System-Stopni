/**
 * @file src/modules/users/dtos/user-profile.dto.ts
 * @description A global DTO that will serve as a template for other DTOs e.g. create-user-profile, update-user-profile, etc.
 */
import { IsDateString, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PartialType } from "@nestjs/mapped-types";
import { UserScoutRank } from '../enums/user-scout-rank.enum';
import { UserScoutTeam } from '../enums/user-scout-team.enum';
import { UserTroopTeam } from '../enums/user-troop-team.enum';

export class UserProfileDto {

    @IsUUID()
    uuid_profile: string;

    @IsString({ message: 'First name must be a string' })
    @IsNotEmpty()
    firstname: string;

    @IsString({ message: 'Last name must be a string' })
    @IsNotEmpty()
    lastname: string;

    @IsDateString()
    @IsNotEmpty()
    dateOfBirth: string;

    @IsString({ message: 'Phone number must be a string' })
    @IsNotEmpty()
    phoneNumber: string;

    @IsDateString()
    @IsNotEmpty()
    startedScoutingAt: string;

    @IsDateString()
    @IsNotEmpty()
    joinedZHRAt: string;

    @IsDateString()
    @IsNotEmpty()
    oathDate: string;

    @IsEnum(UserScoutRank, { message: 'Invalid scout rank' })
    @IsNotEmpty()
    scoutRank: UserScoutRank;

    @IsDateString()
    @IsNotEmpty()
    scoutRankGrantedAt: string;

    @IsIn(['Brak', 'Przewodnik'])
    @IsNotEmpty()
    scoutInstructorRank: 'Brak' | 'Przewodnik'

    @IsEnum(UserScoutTeam, { message: 'Invalid scout team' })
    scoutTeam: UserScoutTeam;

    @IsString()
    @IsNotEmpty()
    functionInScoutTeam: string;

    @IsEnum(UserTroopTeam)
    @IsNotEmpty()
    scoutTroop: UserTroopTeam;

    @IsString()
    @IsNotEmpty()
    functionInTroop: string;

    @IsEnum(UserScoutRank)
    @IsNotEmpty()
    currentRankTarget: UserScoutRank;

    @IsDateString()
    @IsNotEmpty()
    plannedEndDate: string;
}

export class CreateUserProfileDto extends UserProfileDto {}

export class UpdateUserProfileDto extends PartialType(UserProfileDto) {}

export class UserProfileResponseDto extends UserProfileDto {}