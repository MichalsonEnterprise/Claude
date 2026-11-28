"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localAnvil = void 0;
exports.evmChain = evmChain;
exports.explorerTxUrl = explorerTxUrl;
exports.explorerAddressUrl = explorerAddressUrl;
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
/** Local Anvil devnet (chain id 31337) — dev / e2e only; refused in production by the env validation. */
exports.localAnvil = (0, viem_1.defineChain)({
    id: 31_337,
    name: 'Anvil (local devnet)',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
    testnet: true,
});
/** The only chains this build can sign for. Mainnet ids are not representable. */
function evmChain(chainId) {
    if (chainId === chains_1.arbitrumSepolia.id)
        return chains_1.arbitrumSepolia;
    if (chainId === exports.localAnvil.id)
        return exports.localAnvil;
    throw new Error(`Unsupported EVM chain ${chainId}: only Arbitrum Sepolia (421614) or Anvil (31337)`);
}
/** Block-explorer link for a transaction (null on the local devnet). */
function explorerTxUrl(chainId, txHash) {
    if (!txHash)
        return null;
    return chainId === chains_1.arbitrumSepolia.id ? `https://sepolia.arbiscan.io/tx/${txHash}` : null;
}
function explorerAddressUrl(chainId, address) {
    if (!address)
        return null;
    return chainId === chains_1.arbitrumSepolia.id ? `https://sepolia.arbiscan.io/address/${address}` : null;
}
//# sourceMappingURL=evm-chain.js.map