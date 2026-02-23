// @file: apps/api/src/pipelines/zod-validation.pipe.ts
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) { }

  transform(value: unknown) {
    const parsed = this.schema.safeParse(value);
    if (parsed.success) return parsed.data;

    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request payload.',
      details: parsed.error.flatten(),
    });
  }
}