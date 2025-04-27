/**
 * @file src/interceptors/serialize.interceptor.ts
 * @description Interceptor for serializing responses using class-transformer.
 */
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { map } from "rxjs/operators";
import { plainToInstance } from "class-transformer";
import { Observable } from "rxjs";

/**
 * @description Interceptor that transforms the response data into a specific DTO format using class-transformer.
 * @param dto - The Data Transfer Object class to transform the response data into.
 */
interface ClassConstructor {
    new (...args: any[]): any;
}

/**
 * @description Interceptor that serializes the response data using the provided DTO class.
 * @param dto - The Data Transfer Object class to transform the response data into.
 */
@Injectable()
export class SerializeInterceptor implements NestInterceptor {
    constructor(private dto: ClassConstructor) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map((data: any) => {
                return plainToInstance(this.dto, data, {
                    excludeExtraneousValues: true,
                });
            }),
        )
    }
}