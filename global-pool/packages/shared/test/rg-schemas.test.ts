import { describe, expect, it } from 'vitest';

import {
  SELF_EXCLUSION_CODE_PATTERN,
  selfExclusionConfirmFormSchema,
  selfExclusionSchema,
} from '../src/schemas/rg';

const base = { duration: '1y', confirm: true, phrase: 'SELF-EXCLUDE', acknowledged: true } as const;

describe('R28 self-exclusion step-up code (authenticator OR backup code)', () => {
  it('accepts a 6-digit authenticator code and a backup code (any case, dash optional)', () => {
    expect(selfExclusionSchema.parse({ ...base, totpCode: '123456' }).totpCode).toBe('123456');
    expect(selfExclusionSchema.parse({ ...base, totpCode: 'abcd-2345' }).totpCode).toBe('ABCD-2345');
    expect(selfExclusionSchema.parse({ ...base, totpCode: 'ABCD2345' }).totpCode).toBe('ABCD2345');
    expect(selfExclusionSchema.parse(base).totpCode).toBeUndefined();
  });

  it('still rejects malformed codes', () => {
    expect(selfExclusionSchema.safeParse({ ...base, totpCode: '12345' }).success).toBe(false);
    expect(selfExclusionSchema.safeParse({ ...base, totpCode: 'ABC-12' }).success).toBe(false);
  });

  it('the RG7 form accepts the same codes', () => {
    for (const code of ['123456', 'K7Q2-9XMA', 'k7q29xma']) {
      expect(SELF_EXCLUSION_CODE_PATTERN.test(code)).toBe(true);
      expect(
        selfExclusionConfirmFormSchema.safeParse({
          phrase: 'SELF-EXCLUDE',
          acknowledged: true,
          totpCode: code,
        }).success,
      ).toBe(true);
    }
    expect(SELF_EXCLUSION_CODE_PATTERN.test('12-34')).toBe(false);
  });
});
