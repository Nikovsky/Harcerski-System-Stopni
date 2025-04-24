import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthSession } from './session.entity';

@Injectable()
export class SessionsCleanupService {
    private readonly logger = new Logger(SessionsCleanupService.name);

    constructor(
        @InjectRepository(AuthSession)
        private readonly sessionRepository: Repository<AuthSession>,
    ) {}
    @Cron('0 3 * * 0') // co niedzielę o 03:00
    async handleCleanup() {
        const limitDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); 

        const result = await this.sessionRepository
            .createQueryBuilder()
            .delete()
            .where('is_revoked = true')
            .andWhere('updated_at < :limit', { limit: limitDate })
            .execute();
        
        
        this.logger.log(`Usunięto ${result.affected} nieaktywnych sesji`);
    }
}
