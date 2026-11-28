import { getAddress, isAddress } from 'viem';
import { z } from 'zod';

import { getChain, type ChainKey } from '../chains';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** Decode base58 to bytes (no checksum). Returns null on invalid characters. */
export function base58Decode(input: string): Uint8Array | null {
  let n = 0n;
  for (const ch of input) {
    const v = BASE58_ALPHABET.indexOf(ch);
    if (v < 0) return null;
    n = n * 58n + BigInt(v);
  }
  const bytes: number[] = [];
  while (n > 0n) {
    bytes.unshift(Number(n & 0xffn));
    n >>= 8n;
  }
  let leadingZeros = 0;
  while (leadingZeros < input.length && input[leadingZeros] === '1') leadingZeros++;
  return Uint8Array.from([...new Array<number>(leadingZeros).fill(0), ...bytes]);
}

/** Encode bytes as base58 (used for tests / fixtures). */
export function base58Encode(bytes: Uint8Array): string {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) + BigInt(b);
  let out = '';
  while (n > 0n) {
    out = BASE58_ALPHABET[Number(n % 58n)]! + out;
    n /= 58n;
  }
  let i = 0;
  while (i < bytes.length && bytes[i] === 0) {
    out = `1${out}`;
    i++;
  }
  return out;
}

/**
 * EVM address: 0x + 40 hex. Mixed-case addresses must carry a valid EIP-55 checksum (viem `isAddress`, strict);
 * all-lowercase / all-uppercase addresses carry no checksum and are accepted.
 */
export function isEvmAddress(value: string): boolean {
  return isAddress(value, { strict: true });
}

/** Solana address: base58, 32–44 chars, decoding to exactly 32 bytes (an ed25519 public key). */
export function isSolanaAddress(value: string): boolean {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return false;
  return base58Decode(value)?.length === 32;
}

/** Validate an address for a network's address family. */
export function isValidAddressForChain(network: ChainKey, address: string): boolean {
  return getChain(network).family === 'solana' ? isSolanaAddress(address) : isEvmAddress(address);
}

/** Normalise an address for storage / comparison (EIP-55 checksum for EVM; Solana unchanged). */
export function normalizeAddress(network: ChainKey, address: string): string {
  const a = address.trim();
  return getChain(network).family === 'evm' ? getAddress(a) : a;
}

export const evmAddressSchema = z.string().trim().refine(isEvmAddress, {
  error: 'Enter a valid EVM address (0x + 40 hex characters, correct checksum)',
});

export const solanaAddressSchema = z
  .string()
  .trim()
  .refine(isSolanaAddress, { error: 'Enter a valid Solana address (base58, 32–44 characters)' });
