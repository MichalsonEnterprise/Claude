/**
 * Provably-fair recomputation for Pool Dice (browser + Node, WebCrypto only).
 *
 *   commitment  = SHA-256(serverSeed)                         — published before the bet
 *   digest      = HMAC-SHA256(key = serverSeed, "clientSeed:nonce")
 *   roll        = floor(uint32_be(digest[0..4]) × 10 000 / 2³²) / 100   → 0.00 – 99.99
 *
 * ASSUMPTION (flagged in the PUB-01 report): the games service has not published its algorithm yet; the
 * verifier teaser uses this common scheme so the DEMO sample is genuinely recomputable. Align with the
 * games/fairness spec when it lands.
 */

const encoder = new TextEncoder();

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s)
    throw new Error(
      'WebCrypto is unavailable (a secure context — https or localhost — is required)',
    );
  return s;
}

export function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(view, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(text: string): Promise<string> {
  return toHex(await subtle().digest('SHA-256', encoder.encode(text)));
}

export async function hmacSha256(key: string, message: string): Promise<Uint8Array> {
  const k = await subtle().importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await subtle().sign('HMAC', k, encoder.encode(message)));
}

/** Roll 0.00–99.99 from the first 4 bytes of the digest, as a 2-dp string (integer math, no floats). */
export function rollFromDigest(digest: Uint8Array): string {
  if (digest.length < 4) throw new RangeError('digest too short');
  const u32 = ((digest[0]! << 24) >>> 0) + (digest[1]! << 16) + (digest[2]! << 8) + digest[3]!;
  const hundredths = Math.floor((u32 * 10_000) / 2 ** 32); // < 2^53, exact
  return `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, '0')}`;
}

export interface DiceVerification {
  computedHash: string;
  hashMatches: boolean;
  roll: string;
  /** Roll equals the recorded result. */
  resultMatches: boolean;
}

export async function verifyDiceRoll(input: {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  recordedRoll: string;
}): Promise<DiceVerification> {
  const computedHash = await sha256Hex(input.serverSeed);
  const roll = rollFromDigest(
    await hmacSha256(input.serverSeed, `${input.clientSeed}:${input.nonce}`),
  );
  return {
    computedHash,
    hashMatches: computedHash === input.serverSeedHash.toLowerCase(),
    roll,
    resultMatches: roll === input.recordedRoll,
  };
}
