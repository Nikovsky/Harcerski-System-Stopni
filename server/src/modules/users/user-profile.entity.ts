/**
 * @file src/modules/users/user-profile.entity.ts
 * @description Entity representing user profiles (first name, last name) in the database.
 */
import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserScoutRank } from './enums/user-scout-rank.enum';
import { UserScoutTeam } from './enums/user-scout-team.enum';
import { AuthUserAccount } from '../auth/auth-user-account.entity';

/**
 * @description Entity storing detailed profile information about the user such as name, scout rank, and team.
 */
@Entity('user_profiles')
export class UserProfile {

    /**
     * @description Unique identifier (UUID) for the user profile.
     */
    @PrimaryGeneratedColumn('uuid')
    uuid_profile: string;

    /**
     * @description User's first name.
     */
    @Column({ type: 'varchar', length: 64})
    firstname: string;

    /**
     * @description User's last name.
     */
    @Column({ type: 'varchar', length: 125})
    lastname: string;

    /**
     * @description User's scouting rank (e.g., Druh, Młodzik).
     */
    @Column( { type: 'enum', enum: UserScoutRank, default: UserScoutRank.DRUH })
    scoutRank: UserScoutRank;

    /**
     * @description User's instructor rank in scouting organization (e.g., Przewodnik).
     */
    @Column( { default: 'Brak'})
    scoutInstructorRank: 'Brak' | 'Przewodnik'

    /**
     * @description Team or troop to which the user belongs.
     */
    @Column( { type: 'enum', enum: UserScoutTeam})
    scoutTeam: UserScoutTeam;

    /**
     * @description Relation to the associated user account entity.
     */
    @OneToOne(() => AuthUserAccount, user => user.profile)
    userAccount: AuthUserAccount;
}