/**
 * @file src/modules/users/user-profile.entity.ts
 * @description Entity representing user profiles (first name, last name) in the database.
 */
import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserScoutRank } from './enums/user-scout-rank.enum';
import { UserScoutTeam } from './enums/user-scout-team.enum';
import { AuthUserAccount } from '../auth/auth-user-account.entity';

@Entity('user_profiles')
export class UserProfile {

    @PrimaryGeneratedColumn('uuid')
    uuid_profile: string;

    @Column({ type: 'varchar', length: 64})
    firstname: string;

    @Column({ type: 'varchar', length: 125})
    lastname: string;

    @Column( { type: 'enum', enum: UserScoutRank, default: UserScoutRank.DRUH })
    scoutRank: UserScoutRank;

    @Column( { default: 'Brak'})
    scoutInstructorRank: 'Brak' | 'Przewodnik'

    @Column( { type: 'enum', enum: UserScoutTeam})
    scoutTeam: UserScoutTeam;

    @OneToOne(() => AuthUserAccount, user => user.profile)
    @JoinColumn()
    userAccount: AuthUserAccount;
}