/**
 * @file src/modules/users/users.service.ts
 * @description Service handling user-related database operations.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUserAccount } from '../auth/auth-user-account.entity';
import { CreateUserAccountDto } from '../auth/dtos/create-user-account.dto';

@Injectable()
export class UsersService {
    constructor(@InjectRepository(AuthUserAccount) private readonly repo: Repository<AuthUserAccount>) {}

    async create(dto: CreateUserAccountDto): Promise<AuthUserAccount> {
        const user = this.repo.create(dto);

        return this.repo.save(user);
    }

    async findById(uuid: string): Promise<AuthUserAccount | null> {
        return this.repo.findOne({ where: {uuid_account: uuid}})
    }

    async findOneByEmail(email: string): Promise<AuthUserAccount | null> {
        return this.repo.findOne({where: {email}})
    }
}
