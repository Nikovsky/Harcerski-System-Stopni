import {Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, JoinColumn, CreateDateColumn, UpdateDateColumn} from 'typeorm';
import { Trial } from './trial.entity';
import { TrialTaskVerification } from './trial-task-verification.entity';

@Entity('trial_tasks')
export class TrialTask {

    @PrimaryGeneratedColumn('uuid')
    id_task: string;

    @Column({ type: 'varchar', length: 4 })
    requirementKey: string;

    @Column({ default: false })
    isCompleted: boolean;

    @Column({ type: 'text' })
    actionDescription: string;
    
    @Column({ type: 'int' })
    orderIndex: number;

    @Column({ type: 'text' })
    plannedVerification: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
    
    @ManyToOne(() => Trial, trial => trial.tasks, { onDelete: 'CASCADE' })
    @JoinColumn()
    trial: Trial;

    @OneToMany(() => TrialTaskVerification, v => v.task, { cascade: true })
    verifications: TrialTaskVerification[];

}