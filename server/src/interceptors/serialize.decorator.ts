/**
 * @file src/interceptors/serialize.decorator.ts
 * @description Decorator for applying serialization to responses using class-transformer.
 * @param dto - The Data Transfer Object class to transform the response data into.
 */
import { UseInterceptors } from "@nestjs/common";
import { SerializeInterceptor } from "../interceptors/serialize.interceptor";

export function Serialize(dto: any) {
    return UseInterceptors(new SerializeInterceptor(dto));
}
