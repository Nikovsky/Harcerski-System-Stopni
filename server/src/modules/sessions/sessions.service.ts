import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthSession } from './session.entity';
import { AuthUserAccount } from '../auth/auth-user-account.entity';

@Injectable()
export class SessionsService {
constructor(
@InjectRepository(AuthSession)
private sessionRepository: Repository<AuthSession>,
) {}

async createSession(refresh_token: string, user: AuthUserAccount, ipAddress: string, userAgent: string) {

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = this.sessionRepository.create({
        user,
        refresh_token,
        ipAddress,
        userAgent,
        expiresAt,
    } as Partial<AuthSession>) ;
    return this.sessionRepository.save(session);
    }

    async findByRefreshToken(token: string) {
    return this.sessionRepository.findOne({
        where: { refresh_token: token, is_revoked: false },
        relations: ['user'],
    });
    }

    async revokeSession(sessionId: string, userId: string) {
        const session = await this.sessionRepository.findOne({
            where: { uuid_session: sessionId, is_revoked: false },
            relations: ['user'],
        });

        if (!session || session.user.uuid_account !== userId) {
            throw new NotFoundException('Sesja nie została znaleziona');
        }

        session.is_revoked = true;
        await this.sessionRepository.save(session);
    }

    async revokeByToken(token: string) {
        const session = await this.findByRefreshToken(token);
        if (session) {
            session.is_revoked = true;
            await this.sessionRepository.save(session);
        }
    }

    async revokeAllExcept(currentSessionId: string, userId: string) {
        await this.sessionRepository
            .createQueryBuilder()
            .update()
            .set({ is_revoked: true })
            .where('user_id = :userId', { userId })
            .andWhere('uuid_session != :currentId', { currentId: currentSessionId })
            .execute();
    }

    async revokeAllByUser(userId: string) {
        await this.sessionRepository
            .createQueryBuilder()
            .update()
            .set({ is_revoked: true })
            .where('user_id = :userId', { userId })
            .execute();
    }

    async getSessionsForUser(userId: string) {
        const sessions = await this.sessionRepository.find({
                where: { user: { uuid_account: userId } },
                order: { created_at: 'DESC' },
            });

            return sessions.map((s) => ({
                id: s.uuid_session,
                ipAddress: s.ipAddress,
                userAgent: s.userAgent,
                createdAt: s.created_at,
                revoked: s.is_revoked,
            }));
        }
    }
