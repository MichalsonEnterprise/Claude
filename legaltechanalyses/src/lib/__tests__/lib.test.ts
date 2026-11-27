import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildOrder, createInvoice, extractEmail, NowPaymentsError, verifyIpnSignature } from "../nowpayments";
import { PACKAGES, formatEur } from "../packages";
import { parseCheckoutInput } from "../validation";

describe("packages", () => {
  it("has the agreed prices", () => {
    expect(PACKAGES.analysis.priceEur).toBe(500);
    expect(PACKAGES.opinion.priceEur).toBe(1000);
    expect(PACKAGES.full.priceEur).toBe(1500);
    expect(formatEur(1500)).toBe("€1,500");
  });
});

describe("parseCheckoutInput", () => {
  const valid = { packageId: "full", email: "  Founder@Example.COM ", project: "Nord|vault\n", consent: true };
  it("accepts and normalises a valid order", () => {
    const r = parseCheckoutInput(valid);
    expect(r).toEqual({ ok: true, data: { packageId: "full", email: "founder@example.com", project: "Nord vault" } });
  });
  it("rejects unknown packages, bad emails, missing consent and bots", () => {
    expect(parseCheckoutInput({ ...valid, packageId: "gold" })).toMatchObject({ ok: false, field: "packageId" });
    expect(parseCheckoutInput({ ...valid, email: "nope" })).toMatchObject({ ok: false, field: "email" });
    expect(parseCheckoutInput({ ...valid, email: "a@b" })).toMatchObject({ ok: false, field: "email" });
    expect(parseCheckoutInput({ ...valid, consent: "yes" })).toMatchObject({ ok: false, field: "consent" });
    expect(parseCheckoutInput({ ...valid, website: "http://spam" })).toMatchObject({ ok: false });
    expect(parseCheckoutInput(null)).toMatchObject({ ok: false });
  });
  it("ignores any client-sent price", () => {
    const r = parseCheckoutInput({ ...valid, priceEur: 1 });
    expect(r.ok && "priceEur" in r.data).toBe(false);
  });
});

describe("buildOrder", () => {
  it("creates an id matching the success page pattern and carries the email", () => {
    const o = buildOrder(PACKAGES.opinion, "a@b.co", "Nordvault", 1_700_000_000_000, "a1b2c3");
    expect(o.orderId).toMatch(/^LTA-[A-Z]{3,4}-[A-Z0-9]{4,12}-[A-F0-9]{6}$/);
    expect(o.description).toBe("LegalTechAnalyses Legal Opinion (EUR 1000) | a@b.co | Project: Nordvault");
    expect(extractEmail(o.description)).toBe("a@b.co");
  });
});

describe("createInvoice", () => {
  const base = {
    apiKey: "KEY",
    priceAmount: 1500,
    orderId: "LTA-FULL-X-ABCDEF",
    orderDescription: "desc",
    ipnCallbackUrl: "https://site.test/api/nowpayments/ipn",
    successUrl: "https://site.test/payment/success",
    cancelUrl: "https://site.test/payment/cancel",
  };
  it("posts an EUR invoice and returns the hosted URL", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ id: "42", invoice_url: "https://nowpayments.io/payment/?iid=42" }), { status: 200 }),
    );
    const inv = await createInvoice({ ...base, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(inv).toEqual({ id: "42", invoiceUrl: "https://nowpayments.io/payment/?iid=42" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.nowpayments.io/v1/invoice");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("KEY");
    expect(JSON.parse(String(init.body))).toMatchObject({ price_amount: 1500, price_currency: "eur", order_id: base.orderId });
  });
  it("uses the sandbox host when asked", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ id: "1", invoice_url: "https://sandbox.nowpayments.io/payment/?iid=1" }), { status: 200 }),
    );
    await createInvoice({ ...base, sandbox: true, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toBe("https://api-sandbox.nowpayments.io/v1/invoice");
  });
  it("throws on API errors and on unexpected redirect hosts", async () => {
    const failing = vi.fn(async () => new Response(JSON.stringify({ message: "Invalid api key" }), { status: 403 }));
    await expect(createInvoice({ ...base, fetchImpl: failing as unknown as typeof fetch })).rejects.toBeInstanceOf(NowPaymentsError);
    const evil = vi.fn(async () => new Response(JSON.stringify({ id: "1", invoice_url: "https://evil.example/pay" }), { status: 200 }));
    await expect(createInvoice({ ...base, fetchImpl: evil as unknown as typeof fetch })).rejects.toThrow(/unexpected invoice URL/);
  });
});

describe("verifyIpnSignature", () => {
  const secret = "ipn-secret";
  // Independent implementation of the documented algorithm: HMAC-SHA512 over JSON with recursively sorted keys.
  const sortDeep = (o: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(
      Object.keys(o)
        .sort()
        .map((k) => [k, o[k] && typeof o[k] === "object" ? sortDeep(o[k] as Record<string, unknown>) : o[k]]),
    );
  const payload = { payment_status: "finished", order_id: "LTA-OPN-1-ABCDEF", price_amount: 1000, fee: { currency: "btc", depositFee: 0 }, actually_paid: 0.0123 };
  const sign = (p: Record<string, unknown>) => createHmac("sha512", secret).update(JSON.stringify(sortDeep(p))).digest("hex");

  it("accepts a correctly signed body regardless of key order", () => {
    const raw = JSON.stringify(payload);
    expect(verifyIpnSignature(raw, sign(payload), secret)).toBe(true);
    expect(verifyIpnSignature(raw, sign(payload).toUpperCase(), secret)).toBe(true);
  });
  it("rejects tampered bodies, wrong secrets and missing headers", () => {
    const sig = sign(payload);
    expect(verifyIpnSignature(JSON.stringify({ ...payload, price_amount: 1 }), sig, secret)).toBe(false);
    expect(verifyIpnSignature(JSON.stringify(payload), sig, "other")).toBe(false);
    expect(verifyIpnSignature(JSON.stringify(payload), null, secret)).toBe(false);
    expect(verifyIpnSignature("not json", sig, secret)).toBe(false);
  });
});
