/**
 * @file src/modules/users/user-account.entity.ts
 * @description Entity representing user accounts (email, password, role) in the database.
 */
import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from './enums/auth-user-role.enum';
import { UserProfile } from '../users/user-profile.entity';
import { AuthSession } from '../sessions/session.entity'

@Entity('user_accounts')
export class AuthUserAccount {
    @PrimaryGeneratedColumn('uuid')
    uuid_account: string;

    @Column( {type: 'varchar', length: 100, unique: true})
    email: string;

    @Column( { type: "varchar", nullable: true })
    password: string;

    @Column( { default: 'local'})
    provider: 'local' | 'google'

    @Column( { type: 'enum', enum: UserRole, default: UserRole.UZYTKOWNIK })
    role: UserRole;
    
    @OneToOne(() => UserProfile, profile => profile.userAccount, { cascade: true })
    @JoinColumn({ name: 'user_profile_id' })
    profile: UserProfile;

    @OneToMany(() => AuthSession, (session) => session.user)
    sessions: AuthSession[];

    @CreateDateColumn()
    createdAt: Date;
}