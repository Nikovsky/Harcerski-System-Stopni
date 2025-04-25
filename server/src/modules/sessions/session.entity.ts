/**
 * @file src/modules/sessions/session.entity.ts
 * @description Entity representing a user session associated with refresh tokens.
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AuthUserAccount } from '../auth/auth-user-account.entity';

/**
 * @description Entity mapping user sessions for authentication and token validation.
 */
@Entity('auth_session')
export class AuthSession {
    /**
     * @description Unique identifier (UUID) of the session.
     */
    @PrimaryGeneratedColumn('uuid')
    uuid_session: string;

    /**
     * @description Relation to the user account associated with the session.
     */
    @ManyToOne(() => AuthUserAccount, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: AuthUserAccount;

    /**
     * @description Foreign key referencing the user account.
     */
    @Column()
    user_id: string;

    /**
     * @description Optional information about the user's browser or client.
     */
    @Column({ nullable: true })
    userAgent?: string;

    /**
     * @description Optional IP address from which the session was created.
     */
    @Column({ nullable: true })
    ipAddress?: string;

    /**
     * @description Indicates whether the session has been manually revoked.
     */    
    @Column({ type: 'boolean', default: false })
    is_revoked: boolean;

    /**
     * @description Expiration date and time of the session.
     */
    @Column()
    expiresAt: Date;

    /**
     * @description Timestamp of when the session was created.
     */
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    /**
     * @description Timestamp of the last update to the session.
     */
    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;

}