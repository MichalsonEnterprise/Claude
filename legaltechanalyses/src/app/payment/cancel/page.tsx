import type { Metadata } from "next";
import { StatusPage } from "@/components/StatusPage";
import { Button } from "@/components/ui";
import { isPackageId } from "@/lib/packages";

export const metadata: Metadata = { title: "Payment not completed — LegalTechAnalyses", robots: { index: false } };

export default async function CancelPage({ searchParams }: { searchParams: Promise<{ package?: string | string[] }> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.package) ? sp.package[0] : sp.package;
  const href = isPackageId(raw) ? `/checkout?package=${raw}` : "/checkout";
  return (
    <StatusPage icon="close" eyebrow="Payment not completed" title="Your payment was cancelled">
      <p>If you did not send a transaction, nothing was charged. You can return to checkout and try again with the same or a different coin.</p>
      <div className="mt-8 flex justify-center">
        <Button href={href}>Back to checkout</Button>
      </div>
    </StatusPage>
  );
}
