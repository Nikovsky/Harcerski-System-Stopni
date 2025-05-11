/**
 * @file src/modules/users/users.service.ts
 * @description Service handling user-related database operations.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUserAccount } from '../auth/auth-user-account.entity';
import { RegisterUserAccountDto } from '../auth/dtos/auth-user-account.dto';

/**
 * @description Service providing methods to create and retrieve user accounts from the database.
 */
@Injectable()
export class UsersService {
    constructor(@InjectRepository(AuthUserAccount) private readonly repo: Repository<AuthUserAccount>) {}

    /**
     * @description Creates a new user account entity and saves it to the database.
     * @param dto - Data Transfer Object containing user registration information.
     * @returns Promise resolving to the created user account entity.
     */
    async create(dto: RegisterUserAccountDto): Promise<AuthUserAccount> {
        const user = this.repo.create(dto);

        return this.repo.save(user);
    }

    /**
     * @description Finds a user account by its unique identifier (UUID).
     * @param uuid - Unique identifier of the user account.
     * @returns Promise resolving to the user account entity or null if not found.
     */
    async findById(uuid: string): Promise<AuthUserAccount | null> {
        return this.repo.findOne({ where: {uuid_account: uuid}})
    }

    /**
     * @description Finds a user account by the associated email address.
     * @param email - Email address of the user.
     * @returns Promise resolving to the user account entity or null if not found.
     */
    async findOneByEmail(email: string): Promise<AuthUserAccount | null> {
        return this.repo.findOne({where: {email}})
    }
}
