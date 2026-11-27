import type { Metadata } from "next";
import { StatusPage } from "@/components/StatusPage";
import { Button } from "@/components/ui";
import { DELIVERY_HOURS } from "@/lib/packages";

export const metadata: Metadata = { title: "Payment received — LegalTechAnalyses", robots: { index: false } };

const ORDER_RE = /^LTA-[A-Z]{3,4}-[A-Z0-9]{4,12}-[A-F0-9]{6}$/;

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ order?: string | string[] }> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.order) ? sp.order[0] : sp.order;
  const order = raw && ORDER_RE.test(raw) ? raw : null;
  return (
    <StatusPage icon="check" eyebrow="Thank you" title="Your payment is on its way">
      <p>
        As soon as NOWPayments confirms the transaction on-chain, our lawyers start working. Your document will arrive
        at the email address you provided within {DELIVERY_HOURS} hours.
      </p>
      {order ? (
        <p className="mt-6 inline-block rounded-[4px] border border-brand-200 bg-brand-100 px-3 py-2 font-mono text-[13px] text-brand-800">
          Order ID: {order}
        </p>
      ) : null}
      <p className="mt-6 text-[14px]">Please keep your order ID and check your spam folder if nothing arrives.</p>
      <div className="mt-8 flex justify-center">
        <Button href="/">Back to homepage</Button>
      </div>
    </StatusPage>
  );
}
