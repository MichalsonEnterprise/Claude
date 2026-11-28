import { BaseError, decodeErrorResult, type Abi, type Hex } from 'viem';

/** A contract call that would revert (or did): decoded custom error name + args when the ABI knows it. */
export class ChainRevertError extends Error {
  override readonly name = 'ChainRevertError';
  constructor(
    readonly errorName: string,
    readonly args: readonly unknown[],
    readonly rawData: Hex | null,
    message: string,
  ) {
    super(message);
  }
}

/** The RPC is not configured / unreachable / serves an unexpected chain. Safe to retry later. */
export class ChainUnavailableError extends Error {
  override readonly name = 'ChainUnavailableError';
}

const stringifyArg = (a: unknown): string => (typeof a === 'bigint' ? a.toString() : String(a));

/** Finds revert data in a viem error chain and decodes it with `abi` (custom errors, Error(string), Panic). */
export function decodeRevert(err: unknown, abi: Abi): ChainRevertError | null {
  if (!(err instanceof BaseError)) return null;
  const withData = err.walk((e) => {
    const data = (e as { data?: unknown } | undefined)?.data;
    return typeof data === 'string' && data.startsWith('0x') && data.length >= 10;
  }) as { data?: Hex } | null;
  const data = withData?.data ?? null;
  if (!data) {
    const reverted = err.walk((e) => (e as { name?: string }).name === 'ExecutionRevertedError');
    if (!reverted) return null;
    return new ChainRevertError('ExecutionReverted', [], null, err.shortMessage);
  }
  try {
    const decoded = decodeErrorResult({ abi, data });
    const args = (decoded.args ?? []) as readonly unknown[];
    return new ChainRevertError(
      decoded.errorName,
      args,
      data,
      `${decoded.errorName}(${args.map(stringifyArg).join(', ')})`,
    );
  } catch {
    return new ChainRevertError('UnknownRevert', [], data, `reverted with data ${data.slice(0, 10)}`);
  }
}

/** Short, secret-free description of any error (viem errors carry long multi-line details). */
export function errorSummary(err: unknown): string {
  if (err instanceof ChainRevertError) return err.message;
  if (err instanceof BaseError) return err.shortMessage;
  return err instanceof Error ? err.message : String(err);
}
