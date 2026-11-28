/**
 * Supported networks. Owner decision (28 Nov 2026): MVP = Arbitrum Sepolia (chainId 421614) for the pool
 * contract, Chainlink VRF and test-USDT deposits/withdrawals. BNB Chain, Polygon, Ethereum and Solana stay in
 * config as "coming soon" (enabled: false).
 *
 * TESTNET ONLY: only testnet identifiers are configured here. Mainnet chain ids, RPCs and token contracts are
 * deliberately absent while REAL_MONEY_ENABLED=false.
 */
import { MIN_DEPOSIT, MIN_WITHDRAWAL } from './limits';

export const ChainKey = {
  ARBITRUM: 'arbitrum',
  BNB: 'bnb',
  POLYGON: 'polygon',
  ETHEREUM: 'ethereum',
  SOLANA: 'solana',
} as const;
export type ChainKey = (typeof ChainKey)[keyof typeof ChainKey];
export const CHAIN_KEYS = Object.values(ChainKey) as [ChainKey, ...ChainKey[]];

export type AddressFamily = 'evm' | 'solana';
/** 'live' = usable in this deployment (testnet); 'coming_soon' = shown but disabled. */
export type ChainAvailability = 'live' | 'coming_soon';
/** DEMO network health shown on the networks table. */
export type ChainHealth = 'operational' | 'congested' | 'degraded';

export interface TestnetConfig {
  /** e.g. 'Arbitrum Sepolia' */
  name: string;
  /** EVM chain id; null for Solana (cluster based). */
  chainId: number | null;
  /** Solana cluster name. */
  cluster?: 'devnet';
  /** Label of the test token (never a real USDT contract). */
  tokenLabel: string;
  /** Block explorer for the testnet. */
  explorerUrl: string;
  /** Env var that holds the test-USDT contract / mint address (unset → deposits disabled). */
  tokenAddressEnv?: string;
  /** Env var that holds the RPC URL. */
  rpcUrlEnv?: string;
}

export interface ChainConfig {
  /** Stable identifier used everywhere (DB, API, UI). */
  id: ChainKey;
  /** Display name. */
  name: string;
  /** Short name for chips. */
  shortName: string;
  family: AddressFamily;
  testnet: TestnetConfig;
  /** Token standard label, e.g. 'USDT (BEP-20)'. */
  usdtStandard: string;
  /** USDT token decimals on this chain (BEP-20 USDT uses 18). */
  usdtDecimals: number;
  nativeSymbol: string;
  /** Confirmations required before a deposit is credited. */
  confirmations: number;
  /** Human label for confirmations, e.g. '32 (finalized)'. */
  confirmationsLabel: string;
  minDeposit: string;
  minWithdrawal: string;
  /** Typical withdrawal network fee in USDT (DEMO estimate; the API should quote live fees). */
  typicalNetworkFee: string;
  enabled: boolean;
  status: ChainAvailability;
  statusLabel: string;
  /** DEMO network health. */
  health: ChainHealth;
  healthLabel: string;
  /** Design token for the chain colour (see @gp/tokens: --gp-chain-*). */
  colorToken: `chain-${string}`;
}

export const CHAINS: Readonly<Record<ChainKey, ChainConfig>> = Object.freeze({
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    shortName: 'ARB',
    family: 'evm',
    testnet: {
      name: 'Arbitrum Sepolia',
      chainId: 421614,
      tokenLabel: 'Test USDT',
      explorerUrl: 'https://sepolia.arbiscan.io',
      tokenAddressEnv: 'TEST_USDT_ADDRESS_ARBITRUM_SEPOLIA',
      rpcUrlEnv: 'ARBITRUM_SEPOLIA_RPC_URL',
    },
    usdtStandard: 'USDT (Arbitrum One)',
    usdtDecimals: 6,
    nativeSymbol: 'ETH',
    confirmations: 20,
    confirmationsLabel: '20',
    minDeposit: MIN_DEPOSIT,
    minWithdrawal: MIN_WITHDRAWAL,
    typicalNetworkFee: '0.08',
    enabled: true,
    status: 'live',
    statusLabel: 'Live (testnet)',
    health: 'operational',
    healthLabel: 'Operational',
    colorToken: 'chain-arbitrum',
  },
  bnb: {
    id: 'bnb',
    name: 'BNB Chain',
    shortName: 'BNB',
    family: 'evm',
    testnet: {
      name: 'BSC Testnet',
      chainId: 97,
      tokenLabel: 'Test USDT',
      explorerUrl: 'https://testnet.bscscan.com',
    },
    usdtStandard: 'USDT (BEP-20)',
    usdtDecimals: 18,
    nativeSymbol: 'BNB',
    confirmations: 15,
    confirmationsLabel: '15',
    minDeposit: MIN_DEPOSIT,
    minWithdrawal: MIN_WITHDRAWAL,
    typicalNetworkFee: '0.12',
    enabled: false,
    status: 'coming_soon',
    statusLabel: 'Coming soon',
    health: 'operational',
    healthLabel: 'Operational',
    colorToken: 'chain-bnb',
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    shortName: 'POL',
    family: 'evm',
    testnet: {
      name: 'Polygon Amoy',
      chainId: 80002,
      tokenLabel: 'Test USDT',
      explorerUrl: 'https://amoy.polygonscan.com',
    },
    usdtStandard: 'USDT (PoS)',
    usdtDecimals: 6,
    nativeSymbol: 'POL',
    confirmations: 64,
    confirmationsLabel: '64',
    minDeposit: MIN_DEPOSIT,
    minWithdrawal: MIN_WITHDRAWAL,
    typicalNetworkFee: '0.02',
    enabled: false,
    status: 'coming_soon',
    statusLabel: 'Coming soon',
    health: 'operational',
    healthLabel: 'Operational',
    colorToken: 'chain-polygon',
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    shortName: 'ETH',
    family: 'evm',
    testnet: {
      name: 'Sepolia',
      chainId: 11155111,
      tokenLabel: 'Test USDT',
      explorerUrl: 'https://sepolia.etherscan.io',
    },
    usdtStandard: 'USDT (ERC-20)',
    usdtDecimals: 6,
    nativeSymbol: 'ETH',
    confirmations: 12,
    confirmationsLabel: '12',
    minDeposit: MIN_DEPOSIT,
    minWithdrawal: MIN_WITHDRAWAL,
    typicalNetworkFee: '2.40',
    enabled: false,
    status: 'coming_soon',
    statusLabel: 'Coming soon',
    health: 'congested',
    healthLabel: 'Congested (slower)',
    colorToken: 'chain-ethereum',
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    shortName: 'SOL',
    family: 'solana',
    testnet: {
      name: 'Solana Devnet',
      chainId: null,
      cluster: 'devnet',
      tokenLabel: 'Test USDT (SPL)',
      explorerUrl: 'https://explorer.solana.com/?cluster=devnet',
    },
    usdtStandard: 'USDT (SPL)',
    usdtDecimals: 6,
    nativeSymbol: 'SOL',
    confirmations: 32,
    confirmationsLabel: '32 (finalized)',
    minDeposit: MIN_DEPOSIT,
    minWithdrawal: MIN_WITHDRAWAL,
    typicalNetworkFee: '0.01',
    enabled: false,
    status: 'coming_soon',
    statusLabel: 'Coming soon',
    health: 'operational',
    healthLabel: 'Operational',
    colorToken: 'chain-solana',
  },
} satisfies Record<ChainKey, ChainConfig>);

/** Display order used on networks tables (matches the Figma networks section). */
export const CHAIN_DISPLAY_ORDER: readonly ChainKey[] = [
  'arbitrum',
  'bnb',
  'polygon',
  'ethereum',
  'solana',
];

/** The MVP chain: everything money-related runs on Arbitrum Sepolia. */
export const MVP_CHAIN: ChainKey = 'arbitrum';
export const MVP_CHAIN_ID = 421614;

export function isChainKey(value: unknown): value is ChainKey {
  return typeof value === 'string' && (CHAIN_KEYS as readonly string[]).includes(value);
}

export function getChain(key: ChainKey): ChainConfig {
  return CHAINS[key];
}

export function isChainEnabled(key: ChainKey): boolean {
  return CHAINS[key].enabled;
}

export const ENABLED_CHAINS: readonly ChainConfig[] = CHAIN_DISPLAY_ORDER.map(
  (k) => CHAINS[k],
).filter((c) => c.enabled);

/** Find a chain by its EVM testnet chain id (e.g. 421614 → arbitrum). */
export function chainByTestnetId(chainId: number): ChainConfig | undefined {
  return CHAIN_DISPLAY_ORDER.map((k) => CHAINS[k]).find((c) => c.testnet.chainId === chainId);
}

/** Explorer link for a transaction hash on the chain's testnet. */
export function explorerTxUrl(key: ChainKey, txHash: string): string {
  const chain = CHAINS[key];
  if (chain.family === 'solana') return `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;
  return `${chain.testnet.explorerUrl}/tx/${txHash}`;
}

/** Explorer link for an address on the chain's testnet. */
export function explorerAddressUrl(key: ChainKey, address: string): string {
  const chain = CHAINS[key];
  if (chain.family === 'solana')
    return `https://explorer.solana.com/address/${address}?cluster=devnet`;
  return `${chain.testnet.explorerUrl}/address/${address}`;
}
