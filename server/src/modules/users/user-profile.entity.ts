import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserScoutRank } from './enums/user-scout-rank.enum';
import { UserScoutTeam } from './enums/user-scout-team.enum';
import { UserAccount } from './user-account.entity';

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

    @Column( { type: 'enum', enum: UserScoutTeam})
    scoutTeam: UserScoutTeam;

    @OneToOne(() => UserAccount, user => user.profile)
    @JoinColumn()
    userAccount: UserAccount;
}