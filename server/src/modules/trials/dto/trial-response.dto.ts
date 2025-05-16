import { Expose, Type } from 'class-transformer';
import { CommissionDecision, HufcowyPresence, MentorRank } from '../trial.entity';
import { UserProfileResponseDto } from 'src/modules/users/dtos/user-profile.dto';
import { verificationType } from '../trial-task-verification.entity';

export class TrialResponseDto {
    @Expose({ groups: ['user', 'admin'] })
    id_trial: string;

    @Expose({ groups: ['user', 'admin'] })
    heldRoles: string;

    @Expose({ groups: ['user', 'admin'] })
    completedCourses: string;

    @Expose({ groups: ['user', 'admin'] })
    campsAndRoles: string;

    @Expose({ groups: ['user', 'admin'] })
    successes: string;

    @Expose({ groups: ['user', 'admin'] })
    failures: string;

    @Expose({ groups: ['user', 'admin'] })
    mentorName: string;

    @Expose({ groups: ['user', 'admin'] })
    mentorRank: MentorRank;

    @Expose({ groups: ['user', 'admin'] })
    mentorFunction: string;

    @Expose({ groups: ['user', 'admin'] })
    hufcowyPresence: HufcowyPresence;
    
    @Expose({ groups: ['user', 'admin'] })
    plannedTrialEndDate: Date;

    @Expose({ groups: ['admin'] })
    commissionNotes: string;

    @Expose({ groups: ['user', 'admin'] })
    commissionDecision: CommissionDecision;

    @Expose({ groups: ['user', 'admin'] })
    @Type(() => TrialTaskResponseDto)
    tasks: TrialTaskResponseDto[];

    @Expose({ groups: ['user', 'admin'] })
    @Type(() => UserProfileResponseDto)
    profile: UserProfileResponseDto
}

export class TrialTaskResponseDto {
    @Expose({ groups: ['user', 'admin'] })
    id_task: string;

    @Expose({ groups: ['user', 'admin'] })
    requirementKey: string;

    @Expose({ groups: ['user', 'admin'] })
    isCompleted: boolean;

    @Expose({ groups: ['user', 'admin'] })
    actionDescription: string;

    @Expose({ groups: ['user', 'admin'] })
    orderIndex: number;

    @Expose({ groups: ['user', 'admin'] })
    plannedVerification: string;

    @Expose({ groups: ['admin'] })
    createdAt: Date;

    @Expose({ groups: ['admin'] })
    updatedAt: Date;

    @Expose({ groups: ['user', 'admin'] })
    @Type(() => TrialTaskVerificationResponseDto)
    verifications: TrialTaskVerificationResponseDto[];
}

export class TrialTaskVerificationResponseDto {
    @Expose({ groups: ['user', 'admin'] })
    id_verification: string;

    @Expose({ groups: ['user', 'admin'] })
    verificationType: verificationType;

    @Expose({ groups: ['user', 'admin'] })
    value: string;

    @Expose({ groups: ['admin'] })
    createdAt: Date;

    @Expose({ groups: ['admin'] })
    updatedAt: Date;
}