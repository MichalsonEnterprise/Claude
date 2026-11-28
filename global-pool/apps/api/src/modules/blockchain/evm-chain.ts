import { defineChain, type Chain } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

/** Local Anvil devnet (chain id 31337) — dev / e2e only; refused in production by the env validation. */
export const localAnvil = defineChain({
  id: 31_337,
  name: 'Anvil (local devnet)',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
  testnet: true,
});

/** The only chains this build can sign for. Mainnet ids are not representable. */
export function evmChain(chainId: number): Chain {
  if (chainId === arbitrumSepolia.id) return arbitrumSepolia;
  if (chainId === localAnvil.id) return localAnvil;
  throw new Error(`Unsupported EVM chain ${chainId}: only Arbitrum Sepolia (421614) or Anvil (31337)`);
}

/** Block-explorer link for a transaction (null on the local devnet). */
export function explorerTxUrl(chainId: number, txHash: string | null | undefined): string | null {
  if (!txHash) return null;
  return chainId === arbitrumSepolia.id ? `https://sepolia.arbiscan.io/tx/${txHash}` : null;
}

export function explorerAddressUrl(chainId: number, address: string | null | undefined): string | null {
  if (!address) return null;
  return chainId === arbitrumSepolia.id ? `https://sepolia.arbiscan.io/address/${address}` : null;
}
