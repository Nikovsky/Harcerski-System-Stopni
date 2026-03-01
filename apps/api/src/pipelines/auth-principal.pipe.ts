// @file: apps/api/src/pipelines/auth-principal.pipe.ts
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { AuthPrincipalSchema, type AuthPrincipal } from '@hss/schemas';

@Injectable()
export class AuthPrincipalPipe implements PipeTransform {
  transform(value: unknown): AuthPrincipal {
    const parsed = AuthPrincipalSchema.safeParse(value);
    if (parsed.success) return parsed.data;

    throw new BadRequestException({
      code: 'AUTH_PRINCIPAL_INVALID',
      message: 'Invalid authenticated principal payload.',
      details: parsed.error.flatten(),
    });
  }
}

