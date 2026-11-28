/**
 * DTO helpers: request DTOs are classes generated from the shared zod schemas (@gp/shared/schemas) with
 * nestjs-zod, so web and api validate with the very same rules. The global ZodValidationPipe parses body / query /
 * params; failures become VALIDATION_FAILED envelopes with zod issues.
 *
 * Schemas that are not plain objects (discriminated unions) cannot back a class: use
 * `@Body(new ZodValidationPipe(schema))` + `@ZodBody(schema)` for the OpenAPI body.
 */
import { applyDecorators } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { z } from 'zod';

export { createZodDto } from 'nestjs-zod';

export const ZodBody = (schema: z.ZodType) =>
  applyDecorators(
    ApiBody({
      schema: z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Record<
        string,
        unknown
      >,
    }),
  );
