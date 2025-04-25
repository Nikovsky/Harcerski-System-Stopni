/**
 * @file src/modules/auth/auth-user-account.entity.ts
 * @description Entity representing user accounts (email, password, role) in the database.
 */
import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from './enums/auth-user-role.enum';
import { UserProfile } from '../users/user-profile.entity';
import { AuthSession } from '../sessions/session.entity'

/**
 * @description Entity mapping user account information such as email, password, authentication provider, and role.
 */
@Entity('user_accounts')
export class AuthUserAccount {
    /**
     * @description Unique identifier (UUID) for the user account.
     */
    @PrimaryGeneratedColumn('uuid')
    uuid_account: string;

    /**
     * @description User's unique email address used for login.
     */
    @Column( {type: 'varchar', length: 100, unique: true})
    email: string;

    /**
     * @description Hashed user password (nullable for external providers like Google).
     */
    @Column( { type: "varchar", nullable: true })
    password: string;

    /**
     * @description Authentication provider type ('local' or 'google').
     */
    @Column( { default: 'local'})
    provider: 'local' | 'google'

    /**
     * @description User role determining permissions within the system.
     */
    @Column( { type: 'enum', enum: UserRole, default: UserRole.UZYTKOWNIK })
    role: UserRole;

    /**
     * @description One-to-one relation with the user's profile information.
     */
    @OneToOne(() => UserProfile, profile => profile.userAccount, { cascade: true })
    @JoinColumn({ name: 'user_profile_id' })
    profile: UserProfile;

    /**
     * @description One-to-many relation to the user's active and past sessions.
     */
    @OneToMany(() => AuthSession, (session) => session.user)
    sessions: AuthSession[];

    /**
     * @description Timestamp of when the user account was created.
     */
    @CreateDateColumn()
    createdAt: Date;
}