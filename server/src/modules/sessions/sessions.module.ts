import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthSession } from './session.entity';
import { SessionsService } from './sessions.service';

@Module({
    imports: [TypeOrmModule.forFeature([AuthSession])],
    providers: [SessionsService],
    exports: [SessionsService]
})
export class SessionsModule {}
