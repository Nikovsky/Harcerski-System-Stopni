/**
 * @file src/modules/sessions/sessions.service.ts
 * @description Service handling creation, retrieval, and revocation of user sessions.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthSession } from './session.entity';
import { AuthUserAccount } from '../auth/auth-user-account.entity';

/**
 * @description Service providing methods to manage user authentication sessions.
 */
@Injectable()
export class SessionsService {
constructor(
@InjectRepository(AuthSession)
private sessionRepository: Repository<AuthSession>,
) {}

    /**
     * @description Creates a new session record for a user.
     * @param data - Session details including user ID, IP address, user agent, and expiration date.
     * @returns The saved session entity.
     */
    async createSession(data: {
        uuid_session: string;
        user_id: string;
        ipAddress: string;
        userAgent: string;
        expiresAt: Date;
        }) {
        

        const session = this.sessionRepository.create({
            uuid_session: data.uuid_session,
            user: { uuid_account: data.user_id } as AuthUserAccount, // relacja po id
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            expiresAt: data.expiresAt,
            created_at: new Date(),});

        return this.sessionRepository.save(session);
    }

    /**
     * @description Finds an active session by its UUID.
     * @param sessionId - Unique session identifier.
     * @returns The session entity with the associated user, or null if not found.
     */
    async findBySessionId(sessionId: string) {
        return this.sessionRepository.findOne({
            where: { uuid_session: sessionId},
            relations: ['user'],
        });
    }

    /**
     * @description Revokes a specific session belonging to a user.
     * @param sessionId - UUID of the session to revoke.
     * @param userId - UUID of the user who owns the session.
     * @throws NotFoundException if the session is not found or does not belong to the user.
     */
    async revokeSession(sessionId: string, userId: string) {
        const session = await this.sessionRepository.findOne({
            where: { uuid_session: sessionId},
            relations: ['user'],
        });

        if (!session || session.user.uuid_account !== userId) {
            throw new NotFoundException('Sesja nie została znaleziona');
        }

        session.is_revoked = true;
        await this.sessionRepository.save(session);
    }

    /**
     * @description Revokes all sessions for a user except the current one.
     * @param currentSessionId - UUID of the session to keep active.
     * @param userId - UUID of the user whose sessions should be revoked.
     */
    async revokeAllExcept(currentSessionId: string, userId: string) {
        await this.sessionRepository
            .createQueryBuilder()
            .update()
            .set({ is_revoked: true })
            .where('user_id = :userId', { userId })
            .andWhere('uuid_session != :currentId', { currentId: currentSessionId })
            .execute();
    }

    /**
     * @description Revokes all sessions associated with a user.
     * @param userId - UUID of the user whose sessions should be revoked.
     */
    async revokeAllByUser(userId: string) {
        await this.sessionRepository
            .createQueryBuilder()
            .update()
            .set({ is_revoked: true })
            .where('user_id = :userId', { userId })
            .execute();
    }

    /**
     * @description Ensures a user does not exceed a maximum number of active sessions.
     * If limit exceeded, revokes the oldest active session(s).
     * @param userId - UUID of the user.
     * @param maxSessions - Maximum allowed active sessions (default is 3).
     */
    async limitActiveSessions(userId: string, maxSessions = 3) {
        const activeSessions = await this.sessionRepository.find({
            where: { user: { uuid_account: userId }, is_revoked: false },
            order: { created_at: 'ASC' }, // najstarsze najpierw
        });

        if (activeSessions.length >= maxSessions) {
            const oldestSession = activeSessions[0];
            await this.sessionRepository.update(
                { uuid_session: oldestSession.uuid_session },
                { is_revoked: true }
            );
        }
    }

    /**
     * @description Retrieves all sessions for a given user, ordered by creation date.
     * @param userId - UUID of the user.
     * @returns Array of session summaries including IP address, user agent, creation time, and revocation status.
     */
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
