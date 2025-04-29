import { Expose } from "class-transformer";
import { UserScoutRank } from "../enums/user-scout-rank.enum";
import { UserScoutTeam } from "../enums/user-scout-team.enum";

export class UserProfileResponseDto {
    @Expose()
    uuid_profile: string;

    @Expose()
    firstname: string;

    @Expose()
    lastname: string;

    @Expose()
    scoutRank: UserScoutRank;

    @Expose()
    scoutInstructorRank: 'Brak' | 'Przewodnik';

    @Expose()
    scoutTeam: UserScoutTeam;
}