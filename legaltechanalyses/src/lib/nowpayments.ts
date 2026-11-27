import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Package } from "./packages";

/**
 * Minimal NOWPayments client: hosted invoices (POST /v1/invoice) and
 * IPN signature verification (HMAC-SHA512 over the key-sorted JSON body).
 */

export const NOWPAYMENTS_API = {
  live: "https://api.nowpayments.io/v1",
  sandbox: "https://api-sandbox.nowpayments.io/v1",
} as const;

export type Order = { orderId: string; description: string };

/** Builds a unique order id and a human-readable description that carries the customer email. */
export function buildOrder(
  pkg: Package,
  email: string,
  project: string,
  now: number = Date.now(),
  random: string = randomBytes(3).toString("hex"),
): Order {
  const orderId = `LTA-${pkg.code}-${now.toString(36).toUpperCase()}-${random.toUpperCase()}`;
  const parts = [`LegalTechAnalyses ${pkg.name} (EUR ${pkg.priceEur})`, email];
  if (project) parts.push(`Project: ${project}`);
  return { orderId, description: parts.join(" | ").slice(0, 250) };
}

export type InvoiceRequest = {
  apiKey: string;
  sandbox?: boolean;
  priceAmount: number;
  orderId: string;
  orderDescription: string;
  ipnCallbackUrl: string;
  successUrl: string;
  cancelUrl: string;
  fetchImpl?: typeof fetch;
};

export type Invoice = { id: string; invoiceUrl: string };

export class NowPaymentsError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "NowPaymentsError";
  }
}

const ALLOWED_INVOICE_HOSTS = ["nowpayments.io", "sandbox.nowpayments.io"];

export async function createInvoice(req: InvoiceRequest): Promise<Invoice> {
  const base = req.sandbox ? NOWPAYMENTS_API.sandbox : NOWPAYMENTS_API.live;
  const doFetch = req.fetchImpl ?? fetch;
  const res = await doFetch(`${base}/invoice`, {
    method: "POST",
    headers: { "x-api-key": req.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: req.priceAmount,
      price_currency: "eur",
      order_id: req.orderId,
      order_description: req.orderDescription,
      ipn_callback_url: req.ipnCallbackUrl,
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
      is_fixed_rate: true,
    }),
    cache: "no-store",
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
    throw new NowPaymentsError(`NOWPayments invoice failed: ${msg}`, res.status);
  }

  const invoiceUrl = typeof data.invoice_url === "string" ? data.invoice_url : "";
  let host = "";
  try {
    host = new URL(invoiceUrl).hostname;
  } catch {
    /* handled below */
  }
  if (!ALLOWED_INVOICE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
    throw new NowPaymentsError("NOWPayments returned an unexpected invoice URL.");
  }
  return { id: String(data.id ?? ""), invoiceUrl };
}

/** Recursive key sort, identical to NOWPayments' reference implementation. */
export function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      const value = obj[key];
      result[key] =
        value && typeof value === "object" ? sortObject(value as Record<string, unknown>) : value;
      return result;
    }, {});
}

export function signIpnPayload(payload: Record<string, unknown>, secret: string): string {
  return createHmac("sha512", secret).update(JSON.stringify(sortObject(payload))).digest("hex");
}

/** Verifies the `x-nowpayments-sig` header of an IPN callback. */
export function verifyIpnSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return false;
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const expected = Buffer.from(signIpnPayload(payload as Record<string, unknown>, secret), "utf8");
  const given = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function extractEmail(description: unknown): string | null {
  if (typeof description !== "string") return null;
  const match = description.match(/[^\s|@]+@[^\s|@]+\.[a-z]{2,}/i);
  return match ? match[0].toLowerCase() : null;
}

export const FINAL_PAYMENT_STATUS = "finished";
