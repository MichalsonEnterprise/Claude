"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChainUnavailableError = exports.ChainRevertError = void 0;
exports.decodeRevert = decodeRevert;
exports.errorSummary = errorSummary;
const viem_1 = require("viem");
/** A contract call that would revert (or did): decoded custom error name + args when the ABI knows it. */
class ChainRevertError extends Error {
    errorName;
    args;
    rawData;
    name = 'ChainRevertError';
    constructor(errorName, args, rawData, message) {
        super(message);
        this.errorName = errorName;
        this.args = args;
        this.rawData = rawData;
    }
}
exports.ChainRevertError = ChainRevertError;
/** The RPC is not configured / unreachable / serves an unexpected chain. Safe to retry later. */
class ChainUnavailableError extends Error {
    name = 'ChainUnavailableError';
}
exports.ChainUnavailableError = ChainUnavailableError;
const stringifyArg = (a) => (typeof a === 'bigint' ? a.toString() : String(a));
/** Finds revert data in a viem error chain and decodes it with `abi` (custom errors, Error(string), Panic). */
function decodeRevert(err, abi) {
    if (!(err instanceof viem_1.BaseError))
        return null;
    const withData = err.walk((e) => {
        const data = e?.data;
        return typeof data === 'string' && data.startsWith('0x') && data.length >= 10;
    });
    const data = withData?.data ?? null;
    if (!data) {
        const reverted = err.walk((e) => e.name === 'ExecutionRevertedError');
        if (!reverted)
            return null;
        return new ChainRevertError('ExecutionReverted', [], null, err.shortMessage);
    }
    try {
        const decoded = (0, viem_1.decodeErrorResult)({ abi, data });
        const args = decoded.args ?? [];
        return new ChainRevertError(decoded.errorName, args, data, `${decoded.errorName}(${args.map(stringifyArg).join(', ')})`);
    }
    catch {
        return new ChainRevertError('UnknownRevert', [], data, `reverted with data ${data.slice(0, 10)}`);
    }
}
/** Short, secret-free description of any error (viem errors carry long multi-line details). */
function errorSummary(err) {
    if (err instanceof ChainRevertError)
        return err.message;
    if (err instanceof viem_1.BaseError)
        return err.shortMessage;
    return err instanceof Error ? err.message : String(err);
}
//# sourceMappingURL=chain-errors.js.map