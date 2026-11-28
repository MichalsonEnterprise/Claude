import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { canonicalJson, decryptSecret, encryptSecret, sha256Hex } from './crypto';

describe('crypto helpers', () => {
  it('AES-256-GCM round-trips and rejects a wrong key / tampering', () => {
    const key = randomBytes(32);
    const enc = encryptSecret('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', key);
    expect(enc.startsWith('v1.')).toBe(true);
    expect(decryptSecret(enc, key)).toBe('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP');
    expect(() => decryptSecret(enc, randomBytes(32))).toThrow();
    const parts = enc.split('.');
    parts[3] = Buffer.from('tampered').toString('base64url');
    expect(() => decryptSecret(parts.join('.'), key)).toThrow();
  });

  it('canonical JSON sorts keys, drops undefined and stringifies dates/bigints', () => {
    expect(
      canonicalJson({ b: 1, a: { d: undefined, c: 2n }, t: new Date('2026-11-27T20:00:00Z') }),
    ).toBe('{"a":{"c":"2"},"b":1,"t":"2026-11-27T20:00:00.000Z"}');
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
