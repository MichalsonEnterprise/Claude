import { NextResponse } from "next/server";
import { emailConfigured, escapeHtml, sendEmail } from "@/lib/email";
import { extractEmail, FINAL_PAYMENT_STATUS, verifyIpnSignature } from "@/lib/nowpayments";
import { DELIVERY_HOURS } from "@/lib/packages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ipn = {
  payment_id?: number | string;
  payment_status?: string;
  order_id?: string;
  order_description?: string;
  price_amount?: number | string;
  price_currency?: string;
  pay_amount?: number | string;
  actually_paid?: number | string;
  pay_currency?: string;
};

export async function POST(req: Request) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) {
    console.error("[ipn] NOWPAYMENTS_IPN_SECRET is not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const raw = await req.text();
  if (!verifyIpnSignature(raw, req.headers.get("x-nowpayments-sig"), secret)) {
    console.warn("[ipn] invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const ipn = JSON.parse(raw) as Ipn;
  console.info("[ipn] status", { order: ipn.order_id, payment: ipn.payment_id, status: ipn.payment_status });

  if (ipn.payment_status === FINAL_PAYMENT_STATUS && emailConfigured()) {
    const customer = extractEmail(ipn.order_description);
    const orderId = String(ipn.order_id ?? "");
    const what = String(ipn.order_description ?? "").split(" | ")[0] || "your order";
    const paid = `${ipn.actually_paid ?? ipn.pay_amount ?? ""} ${String(ipn.pay_currency ?? "").toUpperCase()}`.trim();

    const notify = process.env.ORDER_NOTIFY_EMAIL;
    if (notify) {
      const lines = [
        `Order: ${orderId}`,
        `Package: ${what}`,
        `Customer email: ${customer ?? "(not found)"}`,
        `Price: ${ipn.price_amount ?? ""} ${String(ipn.price_currency ?? "").toUpperCase()}`,
        `Paid: ${paid}`,
        `NOWPayments payment ID: ${ipn.payment_id ?? ""}`,
        `Description: ${ipn.order_description ?? ""}`,
        `Deliver within ${DELIVERY_HOURS}h.`,
      ];
      await sendEmail({
        to: notify,
        subject: `Paid order ${orderId} — ${what}`,
        text: lines.join("\n"),
        html: `<pre style="font:14px/1.6 monospace">${escapeHtml(lines.join("\n"))}</pre>`,
        replyTo: customer ?? undefined,
      });
    }

    if (customer) {
      const text = [
        "Thank you for your order.",
        "",
        `We have received your payment for ${what} (order ${orderId}).`,
        `Our lawyers are on it — you will receive your document at this email address within ${DELIVERY_HOURS} hours.`,
        "",
        "LegalTechAnalyses",
      ].join("\n");
      await sendEmail({
        to: customer,
        subject: `Payment confirmed — ${what}`,
        text,
        html: `<div style="font:15px/1.6 Inter,Arial,sans-serif;color:#292524"><p>Thank you for your order.</p><p>We have received your payment for <strong>${escapeHtml(what)}</strong> (order <code>${escapeHtml(orderId)}</code>).</p><p>Our lawyers are on it — you will receive your document at this email address within <strong>${DELIVERY_HOURS} hours</strong>.</p><p>LegalTechAnalyses</p></div>`,
        replyTo: notify || undefined,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
