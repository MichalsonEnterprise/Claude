import { describe, expect, it } from 'vitest';

import {
  KYC_DOCUMENT_MIN_BYTES,
  kycDetailsSchema,
  kycDocumentUploadSchema,
  notificationPreferencesUpdateSchema,
  profileUpdateSchema,
} from '../src/schemas';

const VALID = {
  firstNames: 'Nova',
  lastNames: 'Kade',
  dateOfBirth: '1994-03-14',
  nationality: 'PT',
  country: 'PT',
  addressLine: 'Rua do Exemplo 12',
  city: 'Lisboa',
  postalCode: '1100-001',
  occupation: 'Software developer',
  pep: 'not_pep',
  accuracyConfirmed: true,
};

describe('account schemas', () => {
  it('KYC details: reports every problem at once (AUTH-12 Validation state)', () => {
    const r = kycDetailsSchema.safeParse({
      ...VALID,
      lastNames: 'K.',
      dateOfBirth: '2010-03-14',
      postalCode: '1100',
      accuracyConfirmed: false,
    });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path[0]).sort();
    expect(paths).toEqual(['accuracyConfirmed', 'dateOfBirth', 'lastNames', 'postalCode']);
    expect(r.error!.issues.find((i) => i.path[0] === 'postalCode')!.message).toContain('0000-000');
  });

  it('KYC details: real short names pass, only initials are refused (Q22)', () => {
    for (const [firstNames, lastNames] of [
      ['Wei', 'Li'],
      ['Anna', 'Ng'],
      ['Jo', 'Silva'],
      ['Min', 'O'],
      ['Mei', 'Wu'],
      ['Łu', 'Ów'],
    ] as const) {
      const r = kycDetailsSchema.safeParse({ ...VALID, firstNames, lastNames });
      expect(r.success, `${firstNames} ${lastNames}`).toBe(true);
    }
    for (const initials of ['J.', 'J. R.', 'J.R.', 'J R', 'a.b.c.']) {
      const r = kycDetailsSchema.safeParse({ ...VALID, firstNames: initials });
      expect(r.success, initials).toBe(false);
      expect(r.error!.issues[0]!.message).toBe(
        'First name(s) — initials aren’t enough, enter it in full',
      );
    }
    const empty = kycDetailsSchema.safeParse({ ...VALID, lastNames: '  ' });
    expect(empty.error!.issues[0]!.message).toBe(
      'Last name(s) — enter your full name as shown on your ID',
    );
  });

  it('KYC details: accepts a valid Portuguese address; PEP has no default', () => {
    expect(kycDetailsSchema.safeParse(VALID).success).toBe(true);
    const { pep: _pep, ...noPep } = VALID;
    void _pep;
    expect(kycDetailsSchema.safeParse(noPep).success).toBe(false);
  });

  it('documents: side must match the document type; size limits', () => {
    const base = {
      documentType: 'passport',
      side: 'photo_page',
      fileName: 'p.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: KYC_DOCUMENT_MIN_BYTES * 4,
      sha256: 'a'.repeat(64),
    };
    expect(kycDocumentUploadSchema.safeParse(base).success).toBe(true);
    expect(kycDocumentUploadSchema.safeParse({ ...base, side: 'back' }).success).toBe(false);
    expect(
      kycDocumentUploadSchema.safeParse({ ...base, sizeBytes: 11 * 1024 * 1024 }).success,
    ).toBe(false);
    expect(kycDocumentUploadSchema.safeParse({ ...base, mimeType: 'image/gif' }).success).toBe(
      false,
    );
  });

  it('preferences: unknown categories and fields are rejected', () => {
    expect(
      notificationPreferencesUpdateSchema.safeParse({ categories: { nope: { email: true } } })
        .success,
    ).toBe(false);
    expect(
      notificationPreferencesUpdateSchema.safeParse({
        categories: { pool_results: { email: true } },
      }).success,
    ).toBe(true);
    expect(profileUpdateSchema.safeParse({ handle: 'x' }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ timeZone: 'Europe/Lisbon' }).success).toBe(true);
  });
});
