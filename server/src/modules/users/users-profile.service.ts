import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { UserProfile } from './user-profile.entity';
import { AuthUserAccount } from '../auth/auth-user-account.entity';
import { UpdateUserProfileDto, CreateUserProfileDto, UserProfileResponseDto } from './dtos/user-profile.dto';

@Injectable()
export class UsersProfileService {
    constructor(
        @InjectRepository(UserProfile)
        private readonly userProfileRepository: Repository<UserProfile>,

        @InjectRepository(AuthUserAccount)
        private readonly authUserAccountRepository: Repository<AuthUserAccount>
    ) {}

    async createProfile(userId: string, dto: CreateUserProfileDto) {
        const user = await this.authUserAccountRepository.findOne({ where: { uuid_account: userId }, relations: ['profile'] });
        if (!user) throw new NotFoundException('Użytkownik nie znaleziony');
        if (user.profile) throw new ForbiddenException('Profile już istnieje');

        user.profile = this.userProfileRepository.create(dto);

        await this.authUserAccountRepository.save(user);

        return user.profile;
    }

    async updateProfile(userId: string, dto: UpdateUserProfileDto) {
        const user = await this.authUserAccountRepository.findOne({where: { uuid_account: userId}, relations: ['profile']});
        if (!user || !user.profile) throw new NotFoundException('Profil nie istnieje');

        Object.assign(user.profile, dto);
        return this.userProfileRepository.save(user.profile);
    }

    async getProfile(userId: string): Promise<UserProfileResponseDto> {
        const user = await this.authUserAccountRepository.findOne({ where: {uuid_account: userId}, relations: ['profile'] })
        if (!user?.profile) throw new NotFoundException('Profil nie został wypełniony');

        return plainToInstance(UserProfileResponseDto, user.profile, { excludeExtraneousValues: true });
    }
}
