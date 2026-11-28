"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZodBody = exports.createZodDto = void 0;
/**
 * DTO helpers: request DTOs are classes generated from the shared zod schemas (@gp/shared/schemas) with
 * nestjs-zod, so web and api validate with the very same rules. The global ZodValidationPipe parses body / query /
 * params; failures become VALIDATION_FAILED envelopes with zod issues.
 *
 * Schemas that are not plain objects (discriminated unions) cannot back a class: use
 * `@Body(new ZodValidationPipe(schema))` + `@ZodBody(schema)` for the OpenAPI body.
 */
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const zod_1 = require("zod");
var nestjs_zod_1 = require("nestjs-zod");
Object.defineProperty(exports, "createZodDto", { enumerable: true, get: function () { return nestjs_zod_1.createZodDto; } });
const ZodBody = (schema) => (0, common_1.applyDecorators)((0, swagger_1.ApiBody)({
    schema: zod_1.z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }),
}));
exports.ZodBody = ZodBody;
//# sourceMappingURL=zod.js.map