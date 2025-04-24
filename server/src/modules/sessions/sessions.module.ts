import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthSession } from './session.entity';
import { SessionsService } from './sessions.service';
import { SessionsCleanupService } from './sessions-cleanup.service';

@Module({
    imports: [TypeOrmModule.forFeature([AuthSession])],
    providers: [SessionsService, SessionsCleanupService],
    exports: [SessionsService]
})
export class SessionsModule {}
