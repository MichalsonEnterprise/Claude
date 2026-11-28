import { HDKey } from '@scure/bip32';
import { privateKeyToAddress } from 'viem/accounts';
import { toHex } from 'viem';
import { describe, expect, it } from 'vitest';

import { deriveEvmAddress, parseXpub, xpubFingerprint } from './hd';

// Throwaway TEST seed (never funded): fixed bytes so the vectors are reproducible.
const account = HDKey.fromMasterSeed(new Uint8Array(64).fill(7)).derive("m/44'/60'/0'");
const XPUB = account.publicExtendedKey;

describe('HD deposit addresses (xpub only)', () => {
  it('derives the same address as the private key path m/0/i (public derivation is correct)', () => {
    for (const i of [0, 1, 2, 41]) {
      const priv = account.deriveChild(0).deriveChild(i).privateKey!;
      expect(deriveEvmAddress(XPUB, i).address).toBe(privateKeyToAddress(toHex(priv)));
    }
  });

  it('is deterministic, distinct per index and checksummed', () => {
    const a = deriveEvmAddress(XPUB, 5);
    expect(deriveEvmAddress(XPUB, 5)).toEqual(a);
    expect(deriveEvmAddress(XPUB, 6).address).not.toBe(a.address);
    expect(a.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(xpubFingerprint(XPUB)).toHaveLength(16);
  });

  it('refuses private extended keys', () => {
    expect(() => parseXpub(account.privateExtendedKey)).toThrow(/PUBLIC/);
  });
});
