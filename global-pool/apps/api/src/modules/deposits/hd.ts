/**
 * Per-user deposit addresses derived from an extended PUBLIC key (BIP-32, non-hardened external chain m/0/<i>).
 * The API never holds the private key: sweeping is done by a separate, offline/treasury process (testnet only).
 */
import { secp256k1 } from '@noble/curves/secp256k1';
import { HDKey } from '@scure/bip32';
import { getAddress, keccak256, toHex } from 'viem';
import { createHash, randomBytes } from 'node:crypto';

export interface DerivedAddress {
  index: number;
  path: string;
  /** EIP-55 checksummed address. */
  address: `0x${string}`;
}

export function xpubFingerprint(xpub: string): string {
  return createHash('sha256').update(xpub).digest('hex').slice(0, 16);
}

/** Validate that a string is an extended public key (throws otherwise). */
export function parseXpub(xpub: string): HDKey {
  const key = HDKey.fromExtendedKey(xpub);
  if (key.privateKey) throw new Error('DEPOSIT_XPUB must be a PUBLIC extended key (never an xprv)');
  return key;
}

/** EVM address for child `index` of the external chain (m/0/index relative to the xpub). */
export function deriveEvmAddress(xpub: string, index: number): DerivedAddress {
  if (!Number.isInteger(index) || index < 0 || index >= 2 ** 31) throw new RangeError('index out of range');
  const child = parseXpub(xpub).deriveChild(0).deriveChild(index);
  if (!child.publicKey) throw new Error('derivation produced no public key');
  const uncompressed = secp256k1.ProjectivePoint.fromHex(child.publicKey).toRawBytes(false);
  const address = getAddress(`0x${keccak256(toHex(uncompressed.slice(1))).slice(-40)}`);
  return { index, path: `xpub/0/${index}`, address };
}

/**
 * Throwaway DEV xpub (random seed, m/44'/60'/0'), used only when DEPOSIT_XPUB is unset outside production.
 * The seed is discarded immediately — never fund these addresses with anything but test tokens.
 */
export function generateDevXpub(): string {
  const master = HDKey.fromMasterSeed(randomBytes(64));
  return master.derive("m/44'/60'/0'").publicExtendedKey;
}
