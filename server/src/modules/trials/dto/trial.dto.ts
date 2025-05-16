import { IsString, IsNotEmpty, IsEnum, IsArray, ValidateNested, IsDateString,   IsOptional, IsBoolean, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { CommissionDecision, HufcowyPresence, MentorRank } from "../trial.entity";
import { verificationType } from "../trial-task-verification.entity";
import { PartialType } from "@nestjs/mapped-types";

export class TrialDto {
    @IsString()
    @IsNotEmpty()
    heldRoles: string;

    @IsString()
    @IsNotEmpty()
    completedCourses: string;

    @IsString()
    @IsNotEmpty()
    campsAndRoles: string;

    @IsString()
    @IsNotEmpty()
    successes: string;

    @IsString()
    @IsNotEmpty()
    failures: string;

    @IsString()
    @IsNotEmpty()
    mentorName: string;

    @IsNotEmpty()
    @IsEnum(MentorRank)
    mentorRank: MentorRank;

    @IsString()
    @IsNotEmpty()
    mentorFunction: string;

    @IsNotEmpty()
    @IsEnum(HufcowyPresence)
    hufcowyPresence: HufcowyPresence;

    @IsNotEmpty()
    @IsDateString()
    plannedTrialEndDate: Date;
}

export class TrialTaskDto {
    @IsString()
    @IsNotEmpty()
    requirementKey: string;

    @IsBoolean()
    @IsNotEmpty()
    isCompleted: boolean;

    @IsString()
    @IsNotEmpty()
    actionDescription: string;

    @IsInt()
    @IsNotEmpty()
    @Min(0)
    orderIndex: number;

    @IsOptional()
    @IsString()
    plannedVerification?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TrialTaskVerificationDto)
    verifications?: TrialTaskVerificationDto[];
}

export class TrialTaskVerificationDto {
    @IsEnum(verificationType)
    @IsNotEmpty()
    verificationType: verificationType;

    @IsString()
    @IsNotEmpty()
    value: string;
}

export class TrialUpdateDto extends PartialType(TrialDto) {}
export class TrialTaskUpdateDto extends PartialType(TrialTaskDto) {}
export class TrialTaskVerificationUpdateDto extends PartialType(TrialTaskVerificationDto) {}

export class TrialDecisionDto {
    @IsString()
    @IsOptional()
    commissionNotes?: string;

    @IsEnum(CommissionDecision)
    @IsOptional()
    commissionDecision?: CommissionDecision;

    @IsDateString()
    @IsOptional()
    commissionDecisionDate?: Date;
}

