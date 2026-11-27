import { NextResponse } from "next/server";
import { buildOrder, createInvoice, NowPaymentsError } from "@/lib/nowpayments";
import { PACKAGES } from "@/lib/packages";
import { parseCheckoutInput } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function siteOrigin(req: Request): string {
  const configured = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  return configured || new URL(req.url).origin;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = parseCheckoutInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: 400 });
  }

  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    console.error("[checkout] NOWPAYMENTS_API_KEY is not configured");
    return NextResponse.json(
      { error: "Online payments are temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const { packageId, email, project } = parsed.data;
  const pkg = PACKAGES[packageId];
  const origin = siteOrigin(req);
  const order = buildOrder(pkg, email, project);

  try {
    const invoice = await createInvoice({
      apiKey,
      sandbox: process.env.NOWPAYMENTS_SANDBOX === "true",
      priceAmount: pkg.priceEur,
      orderId: order.orderId,
      orderDescription: order.description,
      ipnCallbackUrl: `${origin}/api/nowpayments/ipn`,
      successUrl: `${origin}/payment/success?order=${encodeURIComponent(order.orderId)}`,
      cancelUrl: `${origin}/payment/cancel?package=${pkg.id}`,
    });
    console.info("[checkout] invoice created", { orderId: order.orderId, invoiceId: invoice.id, package: pkg.id });
    return NextResponse.json({ invoiceUrl: invoice.invoiceUrl, orderId: order.orderId });
  } catch (err) {
    const status = err instanceof NowPaymentsError ? err.status : undefined;
    console.error("[checkout] invoice creation failed", { orderId: order.orderId, status, err: String(err) });
    return NextResponse.json(
      { error: "We couldn't start the crypto payment. Please try again in a moment." },
      { status: 502 },
    );
  }
}
