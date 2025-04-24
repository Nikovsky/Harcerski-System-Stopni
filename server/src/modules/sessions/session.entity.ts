import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AuthUserAccount } from '../auth/auth-user-account.entity';

@Entity('auth_session')
export class AuthSession {
    @PrimaryGeneratedColumn('uuid')
    uuid_session: string;

    @ManyToOne(() => AuthUserAccount, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: AuthUserAccount;

    @Column()
    user_id: string;

    @Column({ nullable: true })
    userAgent?: string;

    @Column({ nullable: true })
    ipAddress?: string;

    @Column({ type: 'boolean', default: false })
    is_revoked: boolean;

    @Column()
    expiresAt: Date;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;

}