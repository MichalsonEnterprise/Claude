/**
 * DTO helpers: request DTOs are classes generated from the shared zod schemas (@gp/shared/schemas) with
 * nestjs-zod, so web and api validate with the very same rules. The global ZodValidationPipe parses body / query /
 * params; failures become VALIDATION_FAILED envelopes with zod issues.
 */
export { createZodDto } from 'nestjs-zod';
