import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as checkout } from "@/app/api/checkout/route";
import { POST as ipn } from "@/app/api/nowpayments/ipn/route";
import { signIpnPayload } from "../nowpayments";

const req = (body: unknown, url = "https://site.test/api/checkout") =>
  new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("POST /api/checkout", () => {
  beforeEach(() => {
    vi.stubEnv("NOWPAYMENTS_API_KEY", "KEY");
    vi.stubEnv("SITE_URL", "https://legal.test/");
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("creates an invoice with the server-side price and returns its URL", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: "9", invoice_url: "https://nowpayments.io/payment/?iid=9" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await checkout(req({ packageId: "analysis", email: "a@b.co", consent: true, priceEur: 1 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.invoiceUrl).toBe("https://nowpayments.io/payment/?iid=9");
    const sent = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(sent.price_amount).toBe(500);
    expect(sent.ipn_callback_url).toBe("https://legal.test/api/nowpayments/ipn");
    expect(sent.success_url).toMatch(/^https:\/\/legal\.test\/payment\/success\?order=LTA-ANL-/);
    expect(sent.order_description).toContain("a@b.co");
  });

  it("validates input", async () => {
    const res = await checkout(req({ packageId: "full", email: "bad", consent: true }));
    expect(res.status).toBe(400);
    expect((await res.json()).field).toBe("email");
  });

  it("returns 503 when payments are not configured", async () => {
    vi.stubEnv("NOWPAYMENTS_API_KEY", "");
    const res = await checkout(req({ packageId: "full", email: "a@b.co", consent: true }));
    expect(res.status).toBe(503);
  });

  it("returns 502 when NOWPayments fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    const res = await checkout(req({ packageId: "full", email: "a@b.co", consent: true }));
    expect(res.status).toBe(502);
  });
});

describe("POST /api/nowpayments/ipn", () => {
  beforeEach(() => {
    vi.stubEnv("NOWPAYMENTS_IPN_SECRET", "secret");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "LTA <orders@legal.test>");
    vi.stubEnv("ORDER_NOTIFY_EMAIL", "team@legal.test");
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const body = {
    payment_id: 123,
    payment_status: "finished",
    order_id: "LTA-FULL-ABC123-ABCDEF",
    order_description: "LegalTechAnalyses Full (EUR 1500) | client@firm.io | Project: Hexa",
    price_amount: 1500,
    price_currency: "eur",
    actually_paid: 1520.5,
    pay_currency: "usdttrc20",
  };
  const signed = (b: object, sig?: string) =>
    new Request("https://legal.test/api/nowpayments/ipn", {
      method: "POST",
      headers: { "x-nowpayments-sig": sig ?? signIpnPayload(b as Record<string, unknown>, "secret") },
      body: JSON.stringify(b),
    });

  it("rejects invalid signatures", async () => {
    const res = await ipn(signed(body, createHmac("sha512", "wrong").update("x").digest("hex")));
    expect(res.status).toBe(401);
  });

  it("emails the team and the customer when a payment is finished", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await ipn(signed(body));
    expect(res.status).toBe(200);
    const recipients = fetchMock.mock.calls.map((c) => JSON.parse(String((c as unknown as [string, RequestInit])[1].body)).to[0]);
    expect(recipients).toEqual(["team@legal.test", "client@firm.io"]);
  });

  it("does nothing for intermediate statuses", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await ipn(signed({ ...body, payment_status: "confirming" }));
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
