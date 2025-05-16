import { Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../modules/auth/enums/auth-user-role.enum';

interface ClassConstructor<T = any> {
    new (...args: any[]): T;
}

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
    constructor(private readonly reflector: Reflector) {}
    
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const dto = this.reflector.get<ClassConstructor<any>>('serializer', context.getHandler());
        const request = context.switchToHttp().getRequest();
        
        let groups = ['user']; // domyślnie
        
        const user = request.user;
        const adminRoles = [
            UserRole.ADMIN,
            UserRole.PRZEWODNICZACY,
            UserRole.CZLONEK_KI,
            UserRole.SEKRETARZ,
        ];

        if (user && adminRoles.includes(user.role)) {
        groups = ['user', 'admin']; // komisja ma pełny wgląd
        }
        
        return next.handle().pipe(
            map((data: any) =>
                plainToInstance(dto, data, {
                    groups,
                    excludeExtraneousValues: true,
                }),
            ),
        );
    }
}
