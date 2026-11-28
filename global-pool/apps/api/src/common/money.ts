import type { Prisma } from '@prisma/client';
import { money, toUSDTString, type MoneyInput } from '@gp/shared/money';

/** Canonical USDT string for API responses ('351.75', at least 2 dp) from a Prisma.Decimal / string / bigint. */
export function usdt(value: MoneyInput | null | undefined): string {
  if (value === null || value === undefined) return '0.00';
  return toUSDTString(money(value));
}

/** Same as usdt() but keeps null. */
export function usdtOrNull(value: MoneyInput | null | undefined): string | null {
  return value === null || value === undefined ? null : usdt(value);
}

/** Plain JSON copy for Prisma Json columns (drops undefined; bigints must already be strings). */
export function toJson(value: unknown): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonObject;
}
