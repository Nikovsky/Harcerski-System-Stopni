/**
 * @file src/types/express.d.ts
 * @description This file extends Express types to include user information in the request object.
 */
import { AuthUserAccount } from '../../modules/auth/entities/auth-user-account.entity';

/**
 * @description Augments the Express namespace to add user-related properties for authenticated requests.
 */
declare global {
    namespace Express {

        /**
         * @description Interface representing the authenticated user's data extracted from JWT.
         */
        interface User {
            sub: string;
            email: string;
            role: string;
            uuid_session:  sessionId,
        }
        
        /**
         * @description Extended Request interface including an optional user object.
         */
        interface Request {
            user?: User;
        }
    }
}

export {};