/**
 * @file src/modules/users/user-profile.entity.ts
 * @description Entity representing user profiles (first name, last name) in the database.
 */
import { Column, CreateDateColumn, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserScoutRank } from './enums/user-scout-rank.enum';
import { UserScoutTeam } from './enums/user-scout-team.enum';
import { UserTroopTeam } from './enums/user-troop-team.enum';
import { AuthUserAccount } from '../auth/auth-user-account.entity';
import { Trial } from '../trials/trial.entity';

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
     * @description User's date of birth.
     */
    @Column({ type: 'date', nullable: true})
    dateOfBirth: Date;

    /**
     * @description Phone number of the user.
     */
    @Column({ type: 'varchar', length: 11})
    phoneNumber: string;

    /**
     * @description Start date of scouting experience.
     */
    @Column({ type: 'date', nullable: true})
    startedScoutingAt: Date;

    /**
     * @description Date when the user joined the ZHR (Związek Harcerstwa Rzeczypospolitej).
     */
    @Column({ type: 'date', nullable: true})
    joinedZHRAt: Date;

    /**
     * @description Date when the user took the scout oath.
     */
    @Column({ type: 'date', nullable: true})
    oathDate: Date;

    /**
     * @description User's scouting rank (e.g., Druh, Młodzik).
     */
    @Column( { type: 'enum', enum: UserScoutRank, default: UserScoutRank.DRUH })
    scoutRank: UserScoutRank;
    
    /**
     * @description Date when the user was granted their current scouting rank.
     */
    @Column({ type: 'date', nullable: true})
    scoutRankGrantedAt: Date;

    /**
     * @description User's instructor rank in scouting organization (e.g., Przewodnik).
     */
    @Column( { default: 'Brak'})
    scoutInstructorRank: 'Brak' | 'Przewodnik'

    /**
     * @description Team to which the user belongs.
     */
    @Column( { type: 'enum', enum: UserScoutTeam})
    scoutTeam: UserScoutTeam;

    /**
     * @description Function or role within the scout team (e.g., drużynowy, przyboczny).
     */
    @Column({ type: 'varchar', length: 60, default: 'Brak'})
    functionInScoutTeam: string;
    
    /**
     * @description Troop to which the user belongs.
     */
    @Column({ type: 'enum', enum: UserTroopTeam})
    scoutTroop: UserTroopTeam;

    /**
     * @description Function or role within the troop (e.g. hufcowy).
     */
    @Column({ type: 'varchar', length: 60, default: 'Brak'})
    functionInTroop: string;

    /**
     * @description Currently open trial for a scout rank (e.g. Harcerz Orli).
     */
    @Column({ type: 'enum', enum: UserScoutRank, default: 'Brak'})
    currentRankTarget: UserScoutRank

    /**
     * @description Planned date of completion of a currently open scouting trial for a rank (e.g. Harcerza Orlego).
     */
    @Column({ type: 'date', nullable: true})
    plannedEndDate: Date

    /**
     * @description Relation to the trial entity.
     */
    @OneToMany(() => Trial, trial => trial.profile)
    trials: Trial[];

    /**
     * @description Relation to the associated user account entity.
     */
    @OneToOne(() => AuthUserAccount, user => user.profile)
    userAccount: AuthUserAccount;
}