import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionsService } from 'src/modules/sessions/sessions.service';
import { Request } from 'express';
import { AccessTokenPayload } from 'src/interfaces/jwt.payload';

@Injectable()
export class JwtSessionAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly sessionService: SessionsService) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const ok = (await super.canActivate(context)) as boolean;
        if (!ok) return false;

        const req = context.switchToHttp().getRequest<Request>();
        const user = req.user as AccessTokenPayload;

        const sessionId = user.uuid_session;
        if (!sessionId) {
            throw new UnauthorizedException('Brak uuid sesji w tokenie odświeżania!');
        }

        const session = await this.sessionService.findBySessionId(sessionId);
        if (!session || session.is_revoked || session.expiresAt < new Date()) {
            throw new UnauthorizedException('Sesja nieaktywna lub wygasła');
        }
        
        return true;
    }
}