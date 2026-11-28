"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xpubFingerprint = xpubFingerprint;
exports.parseXpub = parseXpub;
exports.deriveEvmAddress = deriveEvmAddress;
exports.generateDevXpub = generateDevXpub;
/**
 * Per-user deposit addresses derived from an extended PUBLIC key (BIP-32, non-hardened external chain m/0/<i>).
 * The API never holds the private key: sweeping is done by a separate, offline/treasury process (testnet only).
 */
const secp256k1_1 = require("@noble/curves/secp256k1");
const bip32_1 = require("@scure/bip32");
const viem_1 = require("viem");
const node_crypto_1 = require("node:crypto");
function xpubFingerprint(xpub) {
    return (0, node_crypto_1.createHash)('sha256').update(xpub).digest('hex').slice(0, 16);
}
/** Validate that a string is an extended public key (throws otherwise). */
function parseXpub(xpub) {
    const key = bip32_1.HDKey.fromExtendedKey(xpub);
    if (key.privateKey)
        throw new Error('DEPOSIT_XPUB must be a PUBLIC extended key (never an xprv)');
    return key;
}
/** EVM address for child `index` of the external chain (m/0/index relative to the xpub). */
function deriveEvmAddress(xpub, index) {
    if (!Number.isInteger(index) || index < 0 || index >= 2 ** 31)
        throw new RangeError('index out of range');
    const child = parseXpub(xpub).deriveChild(0).deriveChild(index);
    if (!child.publicKey)
        throw new Error('derivation produced no public key');
    const uncompressed = secp256k1_1.secp256k1.ProjectivePoint.fromHex(child.publicKey).toRawBytes(false);
    const address = (0, viem_1.getAddress)(`0x${(0, viem_1.keccak256)((0, viem_1.toHex)(uncompressed.slice(1))).slice(-40)}`);
    return { index, path: `xpub/0/${index}`, address };
}
/**
 * Throwaway DEV xpub (random seed, m/44'/60'/0'), used only when DEPOSIT_XPUB is unset outside production.
 * The seed is discarded immediately — never fund these addresses with anything but test tokens.
 */
function generateDevXpub() {
    const master = bip32_1.HDKey.fromMasterSeed((0, node_crypto_1.randomBytes)(64));
    return master.derive("m/44'/60'/0'").publicExtendedKey;
}
//# sourceMappingURL=hd.js.map