/** The human-readable wallet-ownership message (Figma AUTH-10, decision #28). Valid for 10 minutes, used once. */
export const WALLET_MESSAGE_TTL_MS = 10 * 60_000;

/** Same wording the DEV MOCK signs; in Privy mode the EIP-4361 (SIWE) message from Privy is shown instead. */
export function buildWalletMessage({
  address,
  nonce,
  issuedAt,
}: {
  address: string;
  nonce: string;
  issuedAt: Date;
}): string {
  const when = `${issuedAt.toISOString().slice(0, 10)} ${issuedAt.toISOString().slice(11, 16)} UTC`;
  return [
    `GLOBAL POOL wants you to sign in with your wallet ${address}.`,
    '',
    'This request will not trigger a transaction or cost gas.',
    '',
    `Nonce: ${nonce}`,
    `Issued: ${when}`,
  ].join('\n');
}

/** 0x12aB…9f3C */
export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}
