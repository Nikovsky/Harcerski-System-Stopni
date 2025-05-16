import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { TrialTask } from "./trial-task.entity";

export enum verificationType {
    TEXT = 'TEXT',
    PERSON = 'PERSON',
    FILE = 'FILE',
}

@Entity('trial_task_verifications')
export class TrialTaskVerification {
    @PrimaryGeneratedColumn('uuid')
    id_verification: string;

    @Column({ type: 'enum', enum: verificationType })
    verificationType: verificationType;

    @Column({ type: 'text' })
    value: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => TrialTask, task => task.verifications, { onDelete: 'CASCADE' })
    @JoinColumn()
    task: TrialTask;
}
