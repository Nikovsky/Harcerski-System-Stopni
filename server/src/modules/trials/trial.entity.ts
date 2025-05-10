import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm'; 
import { UserProfile } from '../users/user-profile.entity';
import { TrialTask } from './trial-task.entity';

export enum MentorRank {
    PRZEWODNIK = 'Przewodnik',
    OTWARTA_PODHARC = 'Otwarta próba podharcmistrzowska',
    PODHARC = 'Podharcmistrz',
    HARCMISTRZ = 'Harcmistrz'
}

export enum HufcowyPresence {
    OSOBISTA = 'Obecność osobista',
    ZDALNA = 'Obecność zdalna',
    ZAŁĄCZNIK = 'Opinia w załączniku'
}

export enum CommissionDecision {
    WYSŁANY = 'Wysłany',
    OCZEKUJE = 'Oczekuje na rozpatrzenie',
    POPRAWKI = 'Wymaga poprawek',
    ZATWIERDZONY = 'Zatwierdzony',
    ODRZUCONY = 'Odrzucony'
}

@Entity('trials')
export class Trial {

    @PrimaryGeneratedColumn('uuid')
    id_trial: string;

    @ManyToOne(() => UserProfile, profile => profile.trials, { onDelete: 'CASCADE' })
    @JoinColumn()
    profile: UserProfile;


    @Column({ type: 'text' })
    heldRoles: string;

    @Column({ type: 'text' })
    completedCourses: string;

    @Column({ type: 'text' })
    campsAndRoles: string;

    @Column( { type: 'text'})
    successes: string;

    @Column({ type: 'text'})
    failures: string;

    @Column({ type: 'varchar', length: 128})
    mentorName: string;

    @Column({ type: 'enum', enum: MentorRank, default: MentorRank.PRZEWODNIK })
    mentorRank: MentorRank;

    @Column({ type: 'varchar', length: 64})
    mentorFunction: string;

    @Column({ type: 'enum', enum: HufcowyPresence, default: HufcowyPresence.ZAŁĄCZNIK})
    hufcowyPresence: HufcowyPresence; 

    @Column({ type: 'date'})
    plannedTrialEndDate: Date;

    
    @Column({ type: 'text', nullable: true })
    commissionNotes: string;

    @Column({ type: 'enum', enum: CommissionDecision, default: CommissionDecision.WYSŁANY})
    commissionDecision: CommissionDecision;

    @Column({ type: 'date', nullable: true })
    commissionDecisionDate: Date;

    @OneToMany(() => TrialTask, task => task.trial, { cascade: true })
    tasks: TrialTask[];

}