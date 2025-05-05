import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm'; 
import { UserProfile } from '../users/user-profile.entity';
import { TrialTask } from './trial-task.entity';

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

    @Column({ type: 'enum', enum: ['Przewodnik', 'Otwarta próba podharcmistrzowska', 'Podharcmistrz', 'Harcmistrz'], default: 'Przewodnik' })
    mentorRank: 'Przewodnik' | 'Otwarta próba podharcmistrzowska'| 'Podharcmistrz'| 'Harcmistrz';

    @Column({ type: 'varchar', length: 64})
    mentorFunction: string;

    @Column({ type: 'enum', enum: ['Obecność osobista', 'Obecność zdalna', 'Opinia w załączniku'], default: 'Opinia w załączniku'})
    hufcowyPresence: 'Obecność osobista' | 'Obecność zdalna' | 'Opinia w załączniku'; 

    @Column({ type: 'date'})
    plannedTrialEndDate: Date;

    
    @Column({ type: 'text', nullable: true })
    commissionNotes: string;

    @Column({ type: 'enum', enum: ['Wysłany', 'Oczekuje na rozpatrzenie', 'Wymaga poprawek', 'Zatwierdzony', 'Odrzucony'], default: 'Wysłany'})
    commissionDecision: 'Wysłany' | 'Oczekuje na rozpatrzenie' | 'Wymaga poprawek' | 'Zatwierdzony' | 'Odrzucony';

    @Column({ type: 'date', nullable: true })
    commissionDecisionDate: Date;

    @OneToMany(() => TrialTask, task => task.trial, { cascade: true })
    tasks: TrialTask[];

}