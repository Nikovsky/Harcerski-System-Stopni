/**
 * @file src/modules/sessions/sessions.module.ts
 * @description Module handling session management and cleanup tasks in the SKI/SKS system.
 */
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthSession } from './session.entity';
import { SessionsService } from './sessions.service';
import { SessionsCleanupService } from './sessions-cleanup.service';
import { AuthModule } from '../auth/auth.module';

/**
 * @description NestJS module providing services related to user sessions and their maintenance.
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([AuthSession]),
        forwardRef(() => AuthModule),],
    providers: [SessionsService, SessionsCleanupService],
    exports: [SessionsService]
})
export class SessionsModule {}
